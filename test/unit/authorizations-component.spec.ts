import type { IConfigComponent, IFetchComponent, ILoggerComponent } from '@well-known-components/interfaces'
import type { LinkerAuthorization } from '@dcl/schemas'
import { createAuthorizationsComponent } from '../../src/logic/authorizations'
import { createConfigMockedComponent } from '../mocks/config-component-mock'
import { createFetcherMockedComponent } from '../mocks/fetcher-component-mock'
import { createLogsMockedComponent } from '../mocks/logger-component-mock'
import type { IAuthorizationsComponent } from '../../src/logic/authorizations'

function createMockAuthorization(overrides: Partial<LinkerAuthorization> = {}): LinkerAuthorization {
  return {
    name: 'Test Authorization',
    desc: 'Test description',
    contactInfo: { name: 'Test', email: 'test@example.com' },
    addresses: ['0xTest'],
    plots: ['0,0'],
    onlyDev: false,
    ...overrides
  }
}

function mockFetchResponse(fetcher: jest.Mocked<IFetchComponent>, authorizations: LinkerAuthorization[]): void {
  fetcher.fetch.mockResolvedValueOnce({
    json: jest.fn().mockResolvedValueOnce(authorizations)
  } as never)
}

describe('when using the authorizations component', () => {
  let mockConfig: jest.Mocked<IConfigComponent>
  let mockFetcher: jest.Mocked<IFetchComponent>
  let mockLogs: jest.Mocked<ILoggerComponent>
  let component: IAuthorizationsComponent

  beforeEach(() => {
    mockConfig = createConfigMockedComponent()
    mockFetcher = createFetcherMockedComponent()
    mockLogs = createLogsMockedComponent()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('when creating the component', () => {
    describe('and there are valid authorizations', () => {
      beforeEach(async () => {
        mockConfig.getString.mockResolvedValueOnce('stg')
        mockConfig.getString.mockResolvedValueOnce('https://example.com/authorizations.json')
        mockFetchResponse(mockFetcher, [createMockAuthorization({ addresses: ['0xABC123'], plots: ['0,0', '1,1'] })])

        component = await createAuthorizationsComponent({ config: mockConfig, fetcher: mockFetcher, logs: mockLogs })
      })

      it('should fetch authorizations from the configured URL', () => {
        expect(mockFetcher.fetch).toHaveBeenCalledWith('https://example.com/authorizations.json')
      })
    })

    describe('and authorization has a future startDate', () => {
      beforeEach(async () => {
        mockConfig.getString.mockResolvedValueOnce('stg')
        mockConfig.getString.mockResolvedValueOnce(undefined)
        const futureDate = new Date(Date.now() + 86400000).toISOString()
        mockFetchResponse(mockFetcher, [createMockAuthorization({ addresses: ['0xFuture'], startDate: futureDate })])

        component = await createAuthorizationsComponent({ config: mockConfig, fetcher: mockFetcher, logs: mockLogs })
      })

      it('should not include the authorization', async () => {
        const result = await component.checkAuthorization('0xFuture')
        expect(result.authorized).toBe(false)
      })
    })

    describe('and authorization has a past endDate', () => {
      beforeEach(async () => {
        mockConfig.getString.mockResolvedValueOnce('stg')
        mockConfig.getString.mockResolvedValueOnce(undefined)
        const pastDate = new Date(Date.now() - 86400000).toISOString()
        mockFetchResponse(mockFetcher, [createMockAuthorization({ addresses: ['0xExpired'], endDate: pastDate })])

        component = await createAuthorizationsComponent({ config: mockConfig, fetcher: mockFetcher, logs: mockLogs })
      })

      it('should not include the authorization', async () => {
        const result = await component.checkAuthorization('0xExpired')
        expect(result.authorized).toBe(false)
      })
    })

    describe('and authorization is onlyDev in production environment', () => {
      beforeEach(async () => {
        mockConfig.getString.mockResolvedValueOnce('prd')
        mockConfig.getString.mockResolvedValueOnce(undefined)
        mockFetchResponse(mockFetcher, [createMockAuthorization({ addresses: ['0xDevOnly'], onlyDev: true })])

        component = await createAuthorizationsComponent({ config: mockConfig, fetcher: mockFetcher, logs: mockLogs })
      })

      it('should not include the authorization', async () => {
        const result = await component.checkAuthorization('0xDevOnly')
        expect(result.authorized).toBe(false)
      })
    })

    describe('and authorization has invalid plot coordinates', () => {
      beforeEach(async () => {
        mockConfig.getString.mockResolvedValueOnce('stg')
        mockConfig.getString.mockResolvedValueOnce(undefined)
        mockFetchResponse(mockFetcher, [
          createMockAuthorization({ addresses: ['0xInvalidPlots'], plots: ['invalid', '0,0', '300,300', '-201,0'] })
        ])

        component = await createAuthorizationsComponent({ config: mockConfig, fetcher: mockFetcher, logs: mockLogs })
      })

      it('should only include valid plot coordinates', async () => {
        const result = await component.checkAuthorization('0xInvalidPlots')
        expect(result.authorized).toBe(true)
        expect(result.parcels).toEqual(['0,0'])
      })
    })
  })

  describe('when checking an address authorization', () => {
    beforeEach(async () => {
      mockConfig.getString.mockResolvedValueOnce('stg')
      mockConfig.getString.mockResolvedValueOnce(undefined)
      mockFetchResponse(mockFetcher, [createMockAuthorization({ addresses: ['0xAuthorized'], plots: ['0,0', '1,1'] })])

      component = await createAuthorizationsComponent({ config: mockConfig, fetcher: mockFetcher, logs: mockLogs })
    })

    describe('and the address is authorized', () => {
      it('should return authorized true with parcels', async () => {
        const result = await component.checkAuthorization('0xAuthorized')
        expect(result.authorized).toBe(true)
        expect(result.parcels).toEqual(['0,0', '1,1'])
      })
    })

    describe('and the address is authorized with different casing', () => {
      it('should be case-insensitive', async () => {
        const result = await component.checkAuthorization('0xAUTHORIZED')
        expect(result.authorized).toBe(true)
      })
    })

    describe('and the address is not authorized', () => {
      it('should return authorized false', async () => {
        const result = await component.checkAuthorization('0xUnauthorized')
        expect(result.authorized).toBe(false)
        expect(result.parcels).toBeUndefined()
      })
    })
  })

  describe('when checking parcel access', () => {
    beforeEach(async () => {
      mockConfig.getString.mockResolvedValueOnce('stg')
      mockConfig.getString.mockResolvedValueOnce(undefined)
      mockFetchResponse(mockFetcher, [
        createMockAuthorization({ addresses: ['0xAuthorized'], plots: ['0,0', '1,1', '2,2'] })
      ])

      component = await createAuthorizationsComponent({ config: mockConfig, fetcher: mockFetcher, logs: mockLogs })
    })

    describe('and the address has access to all parcels', () => {
      it('should return hasAccess true with empty missingParcels', async () => {
        const result = await component.checkParcelAccess('0xAuthorized', ['0,0', '1,1'])
        expect(result.hasAccess).toBe(true)
        expect(result.missingParcels).toEqual([])
      })
    })

    describe('and the address is missing access to some parcels', () => {
      it('should return hasAccess false with missingParcels list', async () => {
        const result = await component.checkParcelAccess('0xAuthorized', ['0,0', '5,5', '6,6'])
        expect(result.hasAccess).toBe(false)
        expect(result.missingParcels).toEqual(['5,5', '6,6'])
      })
    })

    describe('and the address is not authorized', () => {
      it('should return hasAccess false with all pointers as missing', async () => {
        const result = await component.checkParcelAccess('0xUnauthorized', ['0,0', '1,1'])
        expect(result.hasAccess).toBe(false)
        expect(result.missingParcels).toEqual(['0,0', '1,1'])
      })
    })
  })

  describe('when updating authorizations', () => {
    describe('and the fetch succeeds', () => {
      beforeEach(async () => {
        mockConfig.getString.mockResolvedValueOnce('stg')
        mockConfig.getString.mockResolvedValueOnce(undefined)
        mockFetchResponse(mockFetcher, [])

        component = await createAuthorizationsComponent({ config: mockConfig, fetcher: mockFetcher, logs: mockLogs })
      })

      it('should update the authorizations data', async () => {
        let result = await component.checkAuthorization('0xNewAddress')
        expect(result.authorized).toBe(false)

        mockFetchResponse(mockFetcher, [createMockAuthorization({ addresses: ['0xNewAddress'], plots: ['5,5'] })])
        await component.updateAuthorizations()

        result = await component.checkAuthorization('0xNewAddress')
        expect(result.authorized).toBe(true)
        expect(result.parcels).toEqual(['5,5'])
      })
    })

    describe('and the fetch fails', () => {
      beforeEach(async () => {
        mockConfig.getString.mockResolvedValueOnce('stg')
        mockConfig.getString.mockResolvedValueOnce(undefined)
        mockFetchResponse(mockFetcher, [createMockAuthorization({ addresses: ['0xExisting'], plots: ['0,0'] })])

        component = await createAuthorizationsComponent({ config: mockConfig, fetcher: mockFetcher, logs: mockLogs })
      })

      it('should keep existing authorizations on error', async () => {
        let result = await component.checkAuthorization('0xExisting')
        expect(result.authorized).toBe(true)

        mockFetcher.fetch.mockRejectedValueOnce(new Error('Network error'))
        await component.updateAuthorizations()

        result = await component.checkAuthorization('0xExisting')
        expect(result.authorized).toBe(true)
      })
    })
  })
})
