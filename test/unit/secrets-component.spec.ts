import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import type { IConfigComponent, ILoggerComponent } from '@well-known-components/interfaces'
import type { ICacheStorageComponent } from '@dcl/core-commons'
import { createSecretsComponent } from '../../src/adapters/secrets'
import { createCacheMockedComponent } from '../mocks/cache-component-mock'
import { createConfigMockedComponent } from '../mocks/config-component-mock'
import { createLogsMockedComponent } from '../mocks/logger-component-mock'

jest.mock('@aws-sdk/client-secrets-manager')

describe('when creating the secrets component', () => {
  let mockCache: jest.Mocked<ICacheStorageComponent>
  let mockConfig: jest.Mocked<IConfigComponent>
  let mockLogs: jest.Mocked<ILoggerComponent>
  let mockSend: jest.Mock

  const region = 'us-west-2'

  beforeEach(() => {
    mockCache = createCacheMockedComponent()
    mockLogs = createLogsMockedComponent()
    mockConfig = createConfigMockedComponent()
    mockSend = jest.fn()
    ;(SecretsManagerClient as jest.Mock).mockImplementation(() => ({
      send: mockSend
    }))
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('and a custom endpoint is provided', () => {
    const endpoint = 'http://localhost:4566'

    beforeEach(async () => {
      mockConfig.requireString.mockResolvedValueOnce(region)
      mockConfig.getString.mockResolvedValueOnce(endpoint)
      mockConfig.getString.mockResolvedValueOnce(undefined) // AWS_ACCESS_KEY_ID
      mockConfig.getString.mockResolvedValueOnce(undefined) // AWS_SECRET_ACCESS_KEY
      await createSecretsComponent({ config: mockConfig, logs: mockLogs, cache: mockCache })
    })

    it('should create the client with the custom endpoint and fallback credentials', () => {
      expect(SecretsManagerClient).toHaveBeenCalledWith({
        region,
        endpoint,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test'
        }
      })
    })
  })

  describe('and no endpoint is provided', () => {
    beforeEach(async () => {
      mockConfig.requireString.mockResolvedValueOnce(region)
      mockConfig.getString.mockResolvedValueOnce(undefined) // AWS_ENDPOINT
      mockConfig.getString.mockResolvedValueOnce(undefined) // AWS_ACCESS_KEY_ID
      mockConfig.getString.mockResolvedValueOnce(undefined) // AWS_SECRET_ACCESS_KEY
      await createSecretsComponent({ config: mockConfig, logs: mockLogs, cache: mockCache })
    })

    it('should create the client without an endpoint', () => {
      expect(SecretsManagerClient).toHaveBeenCalledWith({ region })
    })
  })
})

describe('when calling getSecret', () => {
  let secretsComponent: Awaited<ReturnType<typeof createSecretsComponent>>
  let mockCache: jest.Mocked<ICacheStorageComponent>
  let mockConfig: jest.Mocked<IConfigComponent>
  let mockLogs: jest.Mocked<ILoggerComponent>
  let mockSend: jest.Mock

  const secretId = 'test-secret-id'
  const region = 'us-west-2'

  beforeEach(async () => {
    mockCache = createCacheMockedComponent()
    mockLogs = createLogsMockedComponent()
    mockConfig = createConfigMockedComponent()
    mockSend = jest.fn()
    ;(SecretsManagerClient as jest.Mock).mockImplementation(() => ({
      send: mockSend
    }))

    mockConfig.requireString.mockResolvedValueOnce(region)
    mockConfig.getString.mockResolvedValueOnce(undefined) // AWS_ENDPOINT
    mockConfig.getString.mockResolvedValueOnce(undefined) // AWS_ACCESS_KEY_ID
    mockConfig.getString.mockResolvedValueOnce(undefined) // AWS_SECRET_ACCESS_KEY
    secretsComponent = await createSecretsComponent({ config: mockConfig, logs: mockLogs, cache: mockCache })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('and the secret is cached', () => {
    let cachedSecret: string
    let result: string

    beforeEach(async () => {
      cachedSecret = '{"private_key": "cached-private-key"}'
      mockCache.get.mockResolvedValueOnce(cachedSecret)
      result = await secretsComponent.getSecret(secretId)
    })

    it('should return the cached secret', () => {
      expect(result).toBe(cachedSecret)
    })

    it('should not call AWS Secrets Manager', () => {
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should check the cache with the correct key', () => {
      expect(mockCache.get).toHaveBeenCalledWith(`aws-secret:${secretId}`)
    })
  })

  describe('and the secret is not cached', () => {
    beforeEach(() => {
      mockCache.get.mockResolvedValueOnce(null)
    })

    describe('and AWS returns a valid secret', () => {
      let awsSecretString: string
      let result: string

      beforeEach(async () => {
        awsSecretString = '{"private_key": "aws-private-key"}'
        mockSend.mockResolvedValueOnce({ SecretString: awsSecretString })
        result = await secretsComponent.getSecret(secretId)
      })

      it('should return the secret from AWS', () => {
        expect(result).toBe(awsSecretString)
      })

      it('should call AWS Secrets Manager with the correct command', () => {
        expect(mockSend).toHaveBeenCalledWith(expect.any(GetSecretValueCommand))
      })

      it('should cache the secret for 1 hour with the correct key', () => {
        expect(mockCache.set).toHaveBeenCalledWith(`aws-secret:${secretId}`, awsSecretString, 3600)
      })
    })

    describe('and AWS returns an empty SecretString', () => {
      let error: Error

      beforeEach(async () => {
        mockSend.mockResolvedValueOnce({ SecretString: undefined })

        try {
          await secretsComponent.getSecret(secretId)
        } catch (e) {
          error = e as Error
        }
      })

      it('should throw an error indicating the secret string is empty', () => {
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('Secret string is empty')
      })

      it('should not cache anything', () => {
        expect(mockCache.set).not.toHaveBeenCalled()
      })
    })

    describe('and AWS throws an error', () => {
      let error: Error
      let awsError: Error

      beforeEach(async () => {
        awsError = new Error('AWS connection failed')
        mockSend.mockRejectedValueOnce(awsError)

        try {
          await secretsComponent.getSecret(secretId)
        } catch (e) {
          error = e as Error
        }
      })

      it('should propagate the AWS error', () => {
        expect(error).toBe(awsError)
      })

      it('should not cache anything', () => {
        expect(mockCache.set).not.toHaveBeenCalled()
      })
    })
  })
})
