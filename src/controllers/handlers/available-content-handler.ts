import type { IHttpServerComponent } from '@well-known-components/interfaces'
import { isErrorWithMessage } from '@dcl/core-commons'
import type { HandlerContextWithPath } from '../../types'

/**
 * Handler for the /content/available-content endpoint
 *
 * Proxies requests to the configured Catalyst domain
 *
 * @param context - The request context containing URL and components
 * @returns Proxied response from Catalyst
 */
export async function availableContentHandler(
  context: Pick<
    HandlerContextWithPath<'config' | 'fetcher' | 'logs', '/content/available-content'>,
    'url' | 'components'
  >
): Promise<IHttpServerComponent.IResponse> {
  const {
    url,
    components: { config, fetcher, logs }
  } = context

  const logger = logs.getLogger('available-content-handler')
  const catalystDomain = (await config.getString('CATALYST_DOMAIN')) ?? 'peer-testing.decentraland.org'

  try {
    const response = await fetcher.fetch(`https://${catalystDomain}${url.pathname}${url.search}`)
    const text = await response.text()

    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      if (key.startsWith('content-type') || key.startsWith('access-control-')) {
        headers[key] = value
      }
    })

    return {
      status: response.status,
      headers,
      body: text
    }
  } catch (error) {
    const errorMessage = isErrorWithMessage(error) ? error.message : 'Unknown error'

    logger.error('Error proxying available-content request', { error: errorMessage })
    return {
      status: 500,
      body: { error: 'Failed to fetch available content from Catalyst' }
    }
  }
}
