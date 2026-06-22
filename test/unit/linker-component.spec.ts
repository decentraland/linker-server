import { createContentClient } from 'dcl-catalyst-client'
import type { IConfigComponent, ILoggerComponent } from '@well-known-components/interfaces'
import type { IFetchComponent } from '@dcl/core-commons'
import { Authenticator } from '@dcl/crypto'
import { AuthLinkType } from '@dcl/schemas'
import type { AuthChain } from '@dcl/schemas'
import { createLinkerComponent } from '../../src/logic/linker'
import { createConfigMockedComponent } from '../mocks/config-component-mock'
import { createFetcherMockedComponent } from '../mocks/fetcher-component-mock'
import { createLogsMockedComponent } from '../mocks/logger-component-mock'
import type { ISecretsComponent } from '../../src/adapters/secrets'
import type { ILinkerComponent, UploadFiles } from '../../src/logic/linker'

jest.mock('@dcl/crypto', () => ({
  Authenticator: {
    validateSignature: jest.fn(),
    ownerAddress: jest.fn(),
    createSimpleAuthChain: jest.fn()
  }
}))

jest.mock('dcl-catalyst-client', () => ({
  createContentClient: jest.fn()
}))

const TEST_PRIVATE_KEY = '0x0123456789012345678901234567890123456789012345678901234567890123'
const TEST_SECRET_ID = 'test-linker-secret'
const TEST_CATALYST_DOMAIN = 'peer.decentraland.org'

describe('when using the linker component', () => {
  let mockConfig: jest.Mocked<IConfigComponent>
  let mockLogs: jest.Mocked<ILoggerComponent>
  let mockSecrets: jest.Mocked<ISecretsComponent>
  let mockFetcher: jest.Mocked<IFetchComponent>
  let deployMock: jest.Mock
  let component: ILinkerComponent

  beforeEach(() => {
    mockConfig = createConfigMockedComponent()
    mockLogs = createLogsMockedComponent()
    mockSecrets = { getSecret: jest.fn() }
    mockFetcher = createFetcherMockedComponent()
    deployMock = jest.fn()
    ;(createContentClient as jest.Mock).mockReturnValue({ deploy: deployMock })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('when validating an auth chain', () => {
    beforeEach(async () => {
      mockConfig.requireString.mockResolvedValueOnce(TEST_CATALYST_DOMAIN)
      mockConfig.requireString.mockResolvedValueOnce(TEST_SECRET_ID)
      component = await createLinkerComponent({
        config: mockConfig,
        logs: mockLogs,
        secrets: mockSecrets,
        fetcher: mockFetcher
      })
    })

    describe('and the auth chain has no ECDSA_SIGNED_ENTITY', () => {
      it('should return ok false with no signature error', async () => {
        const authChain: AuthChain = [{ type: AuthLinkType.SIGNER, payload: '0x123', signature: '' }]
        const result = await component.validateAuthChain(authChain)
        expect(result.ok).toBe(false)
        expect(result.error).toBe('No signature')
        expect(result.signerAddress).toBe('')
      })
    })

    describe('and the auth chain has ECDSA_SIGNED_ENTITY without signature', () => {
      it('should return ok false with no signature error', async () => {
        const authChain: AuthChain = [
          { type: AuthLinkType.ECDSA_PERSONAL_SIGNED_ENTITY, payload: 'entity-id', signature: '' }
        ]
        const result = await component.validateAuthChain(authChain)
        expect(result.ok).toBe(false)
        expect(result.error).toBe('No signature')
      })
    })

    describe('and the signature validation fails', () => {
      beforeEach(() => {
        ;(Authenticator.validateSignature as jest.Mock).mockResolvedValueOnce({ ok: false })
      })

      it('should return ok false with invalid signature error', async () => {
        const authChain: AuthChain = [
          { type: AuthLinkType.ECDSA_PERSONAL_SIGNED_ENTITY, payload: 'entity-id', signature: 'invalid-sig' }
        ]
        const result = await component.validateAuthChain(authChain)
        expect(result.ok).toBe(false)
        expect(result.error).toBe('Invalid signature')
      })
    })

    describe('and the signature validation succeeds', () => {
      beforeEach(() => {
        ;(Authenticator.validateSignature as jest.Mock).mockResolvedValueOnce({ ok: true })
        ;(Authenticator.ownerAddress as jest.Mock).mockReturnValueOnce('0xSignerAddress')
      })

      it('should return ok true with signer address', async () => {
        const authChain: AuthChain = [
          { type: AuthLinkType.ECDSA_PERSONAL_SIGNED_ENTITY, payload: 'entity-id', signature: 'valid-sig' }
        ]
        const result = await component.validateAuthChain(authChain)
        expect(result.ok).toBe(true)
        expect(result.signerAddress).toBe('0xSignerAddress')
        expect(result.signedEntityId).toBe('entity-id')
        expect(result.error).toBeUndefined()
      })
    })
  })

  describe('when uploading to the Catalyst', () => {
    let entityId: string
    let files: UploadFiles

    beforeEach(async () => {
      mockConfig.requireString.mockResolvedValueOnce(TEST_CATALYST_DOMAIN)
      mockConfig.requireString.mockResolvedValueOnce(TEST_SECRET_ID)
      mockSecrets.getSecret.mockResolvedValue(JSON.stringify({ private_key: TEST_PRIVATE_KEY }))
      ;(Authenticator.createSimpleAuthChain as jest.Mock).mockReturnValue([
        { type: AuthLinkType.SIGNER, payload: '0xWalletAddress', signature: '' }
      ])

      component = await createLinkerComponent({
        config: mockConfig,
        logs: mockLogs,
        secrets: mockSecrets,
        fetcher: mockFetcher
      })

      entityId = 'bafkreiexample'
      files = { [entityId]: { fieldname: entityId, value: Buffer.from('entity content') } }
    })

    describe('and the upload succeeds', () => {
      let catalystResponse: object

      beforeEach(() => {
        catalystResponse = { createdAt: Date.now() }
        deployMock.mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(catalystResponse) })
      })

      it('should return success true with the catalyst response', async () => {
        const result = await component.uploadToCatalyst(entityId, files)
        expect(result.success).toBe(true)
        expect(result.response).toEqual(catalystResponse)
      })

      it('should create the content client against the catalyst content url with the app fetcher', async () => {
        await component.uploadToCatalyst(entityId, files)
        expect(createContentClient).toHaveBeenCalledWith({
          url: `https://${TEST_CATALYST_DOMAIN}/content`,
          fetcher: mockFetcher
        })
      })

      it('should deploy with the entity files and the custom upload headers/timeout', async () => {
        await component.uploadToCatalyst(entityId, files)
        expect(deployMock).toHaveBeenCalledWith(
          expect.objectContaining({ entityId, files: expect.any(Map) }),
          expect.objectContaining({
            headers: {
              'x-upload-origin': 'dcl_linker',
              'X-Extend-CF-Timeout': '600'
            },
            timeout: 10 * 60 * 1000
          })
        )
      })

      it('should get the secret with the configured secret ID', async () => {
        await component.uploadToCatalyst(entityId, files)
        expect(mockSecrets.getSecret).toHaveBeenCalledWith(TEST_SECRET_ID)
      })
    })

    describe('and the upload fails with a catalyst error response', () => {
      beforeEach(() => {
        deployMock.mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: jest
            .fn()
            .mockResolvedValue('{"statusCode":400,"error":"Bad Request","message":"Entity already exists"}')
        })
      })

      it('should return success false with the error message and status', async () => {
        const result = await component.uploadToCatalyst(entityId, files)
        expect(result.success).toBe(false)
        expect(result.status).toBe(400)
        expect(result.error).toBeDefined()
      })
    })

    describe('and the secret retrieval fails', () => {
      beforeEach(() => {
        mockSecrets.getSecret.mockRejectedValueOnce(new Error('Secret not found'))
      })

      it('should return success false with the error', async () => {
        const result = await component.uploadToCatalyst(entityId, files)
        expect(result.success).toBe(false)
        expect(result.error).toBe('Secret not found')
      })
    })
  })
})
