import type { IHttpServerComponent } from '@well-known-components/interfaces'
import { aboutHandler } from '../../src/controllers/handlers/about-handler'

describe('when calling the about handler', () => {
  let url: URL
  let result: IHttpServerComponent.IResponse

  beforeEach(async () => {
    url = new URL('https://linker.decentraland.org/about')
    result = await aboutHandler({ url, components: {} as never, request: {} as never })
  })

  it('should return status 200 with server metadata', () => {
    expect(result.status).toBe(200)
    expect(result.body).toEqual({
      acceptingUsers: true,
      bff: { healthy: false, publicUrl: 'linker.decentraland.org/bff' },
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
        publicUrl: 'linker.decentraland.org/content'
      },
      lambdas: {
        healthy: true,
        publicUrl: 'linker.decentraland.org/lambdas'
      },
      healthy: true
    })
  })
})
