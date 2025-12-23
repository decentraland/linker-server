import type { IHttpServerComponent } from '@well-known-components/interfaces'
import type { GlobalContext } from '../../types'

/**
 * Handler for the /about endpoint
 *
 * Returns server metadata and configuration information
 *
 * @param context - The request context containing URL information
 * @returns Server about information
 */
export async function aboutHandler(
  context: IHttpServerComponent.DefaultContext<GlobalContext> & { url: URL }
): Promise<IHttpServerComponent.IResponse> {
  const url = context.url.hostname

  return {
    status: 200,
    body: {
      acceptingUsers: true,
      bff: { healthy: false, publicUrl: `${url}/bff` },
      comms: {
        healthy: true,
        protocol: 'v3',
        fixedAdapter: 'offline:offline'
      },
      configurations: {
        networkId: 0,
        globalScenesUrn: [],
        scenesUrn: [],
        realmName: 'LinkerServer'
      },
      content: {
        healthy: true,
        publicUrl: `${url}/content`
      },
      lambdas: {
        healthy: true,
        publicUrl: `${url}/lambdas`
      },
      healthy: true
    }
  }
}
