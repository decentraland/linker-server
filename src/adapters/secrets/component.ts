import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import type { IConfigComponent, ILoggerComponent } from '@well-known-components/interfaces'
import type { ICacheStorageComponent } from '@dcl/core-commons'
import type { ISecretsComponent } from './types'

const CACHE_TTL_SECONDS = 60 * 60 // 1 hour

/**
 * Creates the Secrets component
 *
 * Handles retrieval of secrets from AWS Secrets Manager with caching:
 * 1. Checks cache for existing secret
 * 2. If not cached, fetches from AWS Secrets Manager
 * 3. Caches the result for 1 hour (per secretId)
 *
 * Configuration:
 * - AWS_REGION: AWS region (required)
 * - AWS_ENDPOINT: Optional custom endpoint for LocalStack or other endpoints
 *
 * @param components Required components: config, logs, cache
 * @returns ISecretsComponent implementation
 */
export async function createSecretsComponent(components: {
  config: IConfigComponent
  logs: ILoggerComponent
  cache: ICacheStorageComponent
}): Promise<ISecretsComponent> {
  const { config, logs, cache } = components
  const logger = logs.getLogger('secrets-component')

  const [region, endpoint] = await Promise.all([config.requireString('AWS_REGION'), config.getString('AWS_ENDPOINT')])

  const clientConfig: { region: string; endpoint?: string } = { region }
  if (endpoint) {
    clientConfig.endpoint = endpoint
    logger.info('Using custom endpoint for Secrets Manager', { endpoint })
  }

  const client = new SecretsManagerClient(clientConfig)

  /**
   * Gets a secret value from AWS Secrets Manager
   * Results are cached for 1 hour per secretId
   *
   * @param secretId - The AWS Secrets Manager secret ID to retrieve
   * @returns The secret string value
   * @throws {Error} If the secret string is empty
   */
  async function getSecret(secretId: string): Promise<string> {
    const cacheKey = `aws-secret:${secretId}`

    // Check cache first
    const cached = await cache.get<string>(cacheKey)
    if (cached) {
      logger.debug('Returning cached secret', { secretId })
      return cached
    }

    // Fetch from AWS Secrets Manager
    logger.info('Fetching secret from AWS Secrets Manager', { secretId, region })
    const command = new GetSecretValueCommand({ SecretId: secretId })
    const response = await client.send(command)

    if (!response.SecretString) {
      throw new Error('Secret string is empty')
    }

    // Cache the result for 1 hour
    await cache.set(cacheKey, response.SecretString, CACHE_TTL_SECONDS)
    logger.debug('Secret fetched and cached successfully', { secretId })

    return response.SecretString
  }

  return {
    getSecret
  }
}
