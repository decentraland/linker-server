import type {
  IConfigComponent,
  IFetchComponent,
  IHttpServerComponent,
  ILoggerComponent
} from '@well-known-components/interfaces'
import { availableContentHandler } from '../../src/controllers/handlers/available-content-handler'
import { createConfigMockedComponent } from '../mocks/config-component-mock'
import { createFetcherMockedComponent } from '../mocks/fetcher-component-mock'
import { createLogsMockedComponent } from '../mocks/logger-component-mock'

describe('when calling the available-content handler', () => {
  let mockConfig: jest.Mocked<IConfigComponent>
  let mockFetcher: jest.Mocked<IFetchComponent>
  let mockLogs: jest.Mocked<ILoggerComponent>
  let url: URL

  beforeEach(() => {
    mockLogs = createLogsMockedComponent()
    mockConfig = createConfigMockedComponent()
    mockFetcher = createFetcherMockedComponent()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('and the catalyst returns a successful response', () => {
    let result: IHttpServerComponent.IResponse
    let mockHeaders: Map<string, string>
    let responseText: string

    beforeEach(async () => {
      mockConfig.getString.mockResolvedValueOnce('peer.decentraland.org')

      responseText = JSON.stringify([{ cid: 'test-cid', available: true }])
      mockHeaders = new Map([
        ['content-type', 'application/json'],
        ['access-control-allow-origin', '*'],
        ['x-custom-header', 'should-be-filtered']
      ])

      mockFetcher.fetch.mockResolvedValueOnce({
        status: 200,
        text: jest.fn().mockResolvedValueOnce(responseText),
        headers: {
          forEach: (callback: (value: string, key: string) => void) => {
            mockHeaders.forEach((value, key) => callback(value, key))
          }
        }
      } as never)

      url = new URL('https://linker.decentraland.org/content/available-content?cid=test-cid')
      result = await availableContentHandler({
        url,
        components: { config: mockConfig, fetcher: mockFetcher, logs: mockLogs }
      })
    })

    it('should proxy the request to the catalyst and return the response', () => {
      expect(mockFetcher.fetch).toHaveBeenCalledWith(
        'https://peer.decentraland.org/content/available-content?cid=test-cid'
      )
      expect(result.status).toBe(200)
      expect(result.body).toBe(responseText)
      expect(result.headers).toEqual({
        'content-type': 'application/json',
        'access-control-allow-origin': '*'
      })
    })
  })

  describe('and no catalyst domain is configured', () => {
    beforeEach(async () => {
      mockConfig.getString.mockResolvedValueOnce(undefined)
      mockFetcher.fetch.mockResolvedValueOnce({
        status: 200,
        text: jest.fn().mockResolvedValueOnce('OK'),
        headers: {
          forEach: jest.fn()
        }
      } as never)

      url = new URL('https://linker.decentraland.org/content/available-content')
      await availableContentHandler({
        url,
        components: { config: mockConfig, fetcher: mockFetcher, logs: mockLogs }
      })
    })

    it('should use the default catalyst domain', () => {
      expect(mockFetcher.fetch).toHaveBeenCalledWith('https://peer-testing.decentraland.org/content/available-content')
    })
  })

  describe('and the fetch fails', () => {
    let result: IHttpServerComponent.IResponse

    beforeEach(async () => {
      mockConfig.getString.mockResolvedValueOnce('peer.decentraland.org')
      mockFetcher.fetch.mockRejectedValueOnce(new Error('Network error'))

      url = new URL('https://linker.decentraland.org/content/available-content')
      result = await availableContentHandler({
        url,
        components: { config: mockConfig, fetcher: mockFetcher, logs: mockLogs }
      })
    })

    it('should return status 500 with an error message', () => {
      expect(result.status).toBe(500)
      expect(result.body).toEqual({ error: 'Failed to fetch available content from Catalyst' })
    })
  })
})
