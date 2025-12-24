import type { IHttpServerComponent, ILoggerComponent, IMetricsComponent } from '@well-known-components/interfaces'
import { entitiesHandler } from '../../src/controllers/handlers/entities-handler'
import { createAuthorizationsMockedComponent } from '../mocks/authorizations-component-mock'
import { createLinkerMockedComponent } from '../mocks/linker-component-mock'
import { createLogsMockedComponent } from '../mocks/logger-component-mock'
import { createMetricsMockedComponent } from '../mocks/metrics-component-mock'
import type { IAuthorizationsComponent } from '../../src/logic/authorizations'
import type { ILinkerComponent } from '../../src/logic/linker'
import type { metricDeclarations } from '../../src/metrics'

type MetricsKeys = keyof typeof metricDeclarations

/**
 * Helper to create auth chain fields in the multipart format
 */
function createAuthChainFields(authChain: Array<{ type: string; payload: string; signature?: string }>) {
  const fields: Record<string, { fieldname: string; value: string }> = {}
  authChain.forEach((link, index) => {
    fields[`authChain[${index}][type]`] = { fieldname: `authChain[${index}][type]`, value: link.type }
    fields[`authChain[${index}][payload]`] = { fieldname: `authChain[${index}][payload]`, value: link.payload }
    fields[`authChain[${index}][signature]`] = {
      fieldname: `authChain[${index}][signature]`,
      value: link.signature ?? ''
    }
  })
  return fields
}

describe('when calling the entities handler', () => {
  let mockLogs: jest.Mocked<ILoggerComponent>
  let mockMetrics: jest.Mocked<IMetricsComponent<MetricsKeys>>
  let mockAuthorizations: jest.Mocked<IAuthorizationsComponent>
  let mockLinker: jest.Mocked<ILinkerComponent>

  beforeEach(() => {
    mockLogs = createLogsMockedComponent()
    mockMetrics = createMetricsMockedComponent()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('and no auth chain is provided', () => {
    let result: IHttpServerComponent.IResponse

    beforeEach(async () => {
      mockAuthorizations = createAuthorizationsMockedComponent()
      mockLinker = createLinkerMockedComponent()

      result = await entitiesHandler({
        formData: {
          fields: {},
          files: {}
        },
        components: {
          logs: mockLogs,
          metrics: mockMetrics,
          authorizations: mockAuthorizations,
          linker: mockLinker
        }
      } as never)
    })

    it('should return status 403 with a forbidden error', () => {
      expect(result.status).toBe(403)
      expect(result.body).toEqual({ error: 'Forbidden', message: 'No auth chain provided' })
    })

    it('should increment the forbidden upload counter', () => {
      expect(mockMetrics.increment).toHaveBeenCalledWith('linker_entity_upload_counter', { status: 'forbidden' })
    })
  })

  describe('and the auth chain is invalid', () => {
    let result: IHttpServerComponent.IResponse

    beforeEach(async () => {
      mockAuthorizations = createAuthorizationsMockedComponent()
      mockLinker = createLinkerMockedComponent()
      mockLinker.validateAuthChain.mockResolvedValueOnce({ ok: false, signerAddress: '', error: 'Invalid signature' })

      result = await entitiesHandler({
        formData: {
          fields: createAuthChainFields([{ type: 'SIGNER', payload: '0x123' }]),
          files: {}
        },
        components: {
          logs: mockLogs,
          metrics: mockMetrics,
          authorizations: mockAuthorizations,
          linker: mockLinker
        }
      } as never)
    })

    it('should return status 403 with an invalid auth chain error', () => {
      expect(result.status).toBe(403)
      expect(result.body).toEqual({ error: 'Forbidden', message: 'Invalid auth chain' })
    })
  })

  describe('and the address is not authorized', () => {
    let result: IHttpServerComponent.IResponse

    beforeEach(async () => {
      mockAuthorizations = createAuthorizationsMockedComponent()
      mockAuthorizations.checkAuthorization.mockResolvedValueOnce({ authorized: false })

      mockLinker = createLinkerMockedComponent()
      mockLinker.validateAuthChain.mockResolvedValueOnce({ ok: true, signerAddress: '0xunauthorized' })

      result = await entitiesHandler({
        formData: {
          fields: createAuthChainFields([{ type: 'SIGNER', payload: '0xunauthorized' }]),
          files: {}
        },
        components: {
          logs: mockLogs,
          metrics: mockMetrics,
          authorizations: mockAuthorizations,
          linker: mockLinker
        }
      } as never)
    })

    it('should return status 403 with an address not found error', () => {
      expect(result.status).toBe(403)
      expect(result.body).toEqual({ error: 'Forbidden', message: 'Address not found' })
    })

    it('should check authorization with the signer address', () => {
      expect(mockAuthorizations.checkAuthorization).toHaveBeenCalledWith('0xunauthorized')
    })
  })

  describe('and the entityId is missing', () => {
    let result: IHttpServerComponent.IResponse

    beforeEach(async () => {
      mockAuthorizations = createAuthorizationsMockedComponent()
      mockAuthorizations.checkAuthorization.mockResolvedValueOnce({ authorized: true, parcels: ['0,0'] })

      mockLinker = createLinkerMockedComponent()
      mockLinker.validateAuthChain.mockResolvedValueOnce({ ok: true, signerAddress: '0xauthorized' })

      result = await entitiesHandler({
        formData: {
          fields: createAuthChainFields([{ type: 'SIGNER', payload: '0xauthorized' }]),
          files: {}
        },
        components: {
          logs: mockLogs,
          metrics: mockMetrics,
          authorizations: mockAuthorizations,
          linker: mockLinker
        }
      } as never)
    })

    it('should return status 400 with a missing entityId error', () => {
      expect(result.status).toBe(400)
      expect(result.body).toEqual({ error: 'Bad request', message: 'Missing entityId' })
    })

    it('should increment the invalid request counter', () => {
      expect(mockMetrics.increment).toHaveBeenCalledWith('linker_entity_upload_counter', { status: 'invalid_request' })
    })
  })

  describe('and the entity file is missing', () => {
    let result: IHttpServerComponent.IResponse

    beforeEach(async () => {
      mockAuthorizations = createAuthorizationsMockedComponent()
      mockAuthorizations.checkAuthorization.mockResolvedValueOnce({ authorized: true, parcels: ['0,0'] })

      mockLinker = createLinkerMockedComponent()
      mockLinker.validateAuthChain.mockResolvedValueOnce({ ok: true, signerAddress: '0xauthorized' })

      result = await entitiesHandler({
        formData: {
          fields: {
            ...createAuthChainFields([{ type: 'SIGNER', payload: '0xauthorized' }]),
            entityId: { fieldname: 'entityId', value: 'bafkreiexample' }
          },
          files: {}
        },
        components: {
          logs: mockLogs,
          metrics: mockMetrics,
          authorizations: mockAuthorizations,
          linker: mockLinker
        }
      } as never)
    })

    it('should return status 400 with a missing entity file error', () => {
      expect(result.status).toBe(400)
      expect(result.body).toEqual({ error: 'Bad request', message: 'Missing entity file' })
    })
  })

  describe('and the user does not have access to the parcels', () => {
    let result: IHttpServerComponent.IResponse

    beforeEach(async () => {
      mockAuthorizations = createAuthorizationsMockedComponent()
      mockAuthorizations.checkAuthorization.mockResolvedValueOnce({ authorized: true, parcels: ['0,0'] })
      mockAuthorizations.checkParcelAccess.mockResolvedValueOnce({
        hasAccess: false,
        missingParcels: ['1,1', '2,2']
      })

      mockLinker = createLinkerMockedComponent()
      mockLinker.validateAuthChain.mockResolvedValueOnce({ ok: true, signerAddress: '0xauthorized' })

      const entityContent = JSON.stringify({ pointers: ['0,0', '1,1', '2,2'] })

      result = await entitiesHandler({
        formData: {
          fields: {
            ...createAuthChainFields([{ type: 'SIGNER', payload: '0xauthorized' }]),
            entityId: { fieldname: 'entityId', value: 'bafkreiexample' }
          },
          files: {
            bafkreiexample: { fieldname: 'bafkreiexample', value: Buffer.from(entityContent) }
          }
        },
        components: {
          logs: mockLogs,
          metrics: mockMetrics,
          authorizations: mockAuthorizations,
          linker: mockLinker
        }
      } as never)
    })

    it('should return status 403 with a missing access error', () => {
      expect(result.status).toBe(403)
      expect(result.body).toEqual({
        error: 'Forbidden',
        message: 'Missing access for 2 parcels:\n1,1; 2,2'
      })
    })

    it('should check parcel access with the signer address and entity pointers', () => {
      expect(mockAuthorizations.checkParcelAccess).toHaveBeenCalledWith('0xauthorized', ['0,0', '1,1', '2,2'])
    })
  })

  describe('and the upload to catalyst fails', () => {
    let result: IHttpServerComponent.IResponse

    beforeEach(async () => {
      mockAuthorizations = createAuthorizationsMockedComponent()
      mockAuthorizations.checkAuthorization.mockResolvedValueOnce({ authorized: true, parcels: ['0,0'] })
      mockAuthorizations.checkParcelAccess.mockResolvedValueOnce({ hasAccess: true, missingParcels: [] })

      mockLinker = createLinkerMockedComponent()
      mockLinker.validateAuthChain.mockResolvedValueOnce({ ok: true, signerAddress: '0xauthorized' })
      mockLinker.uploadToCatalyst.mockResolvedValueOnce({ success: false, error: 'Catalyst rejected the upload' })

      const entityContent = JSON.stringify({ pointers: ['0,0'] })

      result = await entitiesHandler({
        formData: {
          fields: {
            ...createAuthChainFields([{ type: 'SIGNER', payload: '0xauthorized' }]),
            entityId: { fieldname: 'entityId', value: 'bafkreiexample' }
          },
          files: {
            bafkreiexample: { fieldname: 'bafkreiexample', value: Buffer.from(entityContent) }
          }
        },
        components: {
          logs: mockLogs,
          metrics: mockMetrics,
          authorizations: mockAuthorizations,
          linker: mockLinker
        }
      } as never)
    })

    it('should return status 500 with the catalyst error message', () => {
      expect(result.status).toBe(500)
      expect(result.body).toEqual({ error: 'Internal server error', message: 'Catalyst rejected the upload' })
    })

    it('should increment the error upload counter', () => {
      expect(mockMetrics.increment).toHaveBeenCalledWith('linker_entity_upload_counter', { status: 'error' })
    })
  })

  describe('and the upload is successful', () => {
    let result: IHttpServerComponent.IResponse
    let catalystResponse: object

    beforeEach(async () => {
      catalystResponse = { createdAt: Date.now() }

      mockAuthorizations = createAuthorizationsMockedComponent()
      mockAuthorizations.checkAuthorization.mockResolvedValueOnce({ authorized: true, parcels: ['0,0'] })
      mockAuthorizations.checkParcelAccess.mockResolvedValueOnce({ hasAccess: true, missingParcels: [] })

      mockLinker = createLinkerMockedComponent()
      mockLinker.validateAuthChain.mockResolvedValueOnce({ ok: true, signerAddress: '0xauthorized' })
      mockLinker.uploadToCatalyst.mockResolvedValueOnce({ success: true, response: catalystResponse })

      const entityContent = JSON.stringify({ pointers: ['0,0'] })

      result = await entitiesHandler({
        formData: {
          fields: {
            ...createAuthChainFields([{ type: 'SIGNER', payload: '0xauthorized' }]),
            entityId: { fieldname: 'entityId', value: 'bafkreiexample' }
          },
          files: {
            bafkreiexample: { fieldname: 'bafkreiexample', value: Buffer.from(entityContent) }
          }
        },
        components: {
          logs: mockLogs,
          metrics: mockMetrics,
          authorizations: mockAuthorizations,
          linker: mockLinker
        }
      } as never)
    })

    it('should return status 200 with the catalyst response', () => {
      expect(result.status).toBe(200)
      expect(result.body).toEqual(catalystResponse)
    })

    it('should increment the success upload counter', () => {
      expect(mockMetrics.increment).toHaveBeenCalledWith('linker_entity_upload_counter', { status: 'success' })
    })

    it('should call uploadToCatalyst with the entityId and files', () => {
      expect(mockLinker.uploadToCatalyst).toHaveBeenCalledWith('bafkreiexample', {
        bafkreiexample: { fieldname: 'bafkreiexample', value: expect.any(Buffer) }
      })
    })
  })
})
