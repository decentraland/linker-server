import { Router } from '@well-known-components/http-server'
import { multipartParserWrapper } from '@well-known-components/multipart-wrapper'
import { errorHandler } from '@dcl/platform-server-commons'
import { aboutHandler } from './handlers/about-handler'
import { availableContentHandler } from './handlers/available-content-handler'
import { entitiesHandler } from './handlers/entities-handler'
import { pingHandler } from './handlers/ping-handler'
import type { GlobalContext } from '../types'

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(_: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  // Error handler middleware
  router.use(errorHandler)

  // Health endpoints
  router.get('/ping', pingHandler)
  router.get('/health/ready', pingHandler)
  router.get('/health/startup', pingHandler)
  router.get('/health/live', pingHandler)

  // About endpoint
  router.get('/about', aboutHandler)

  // Content endpoints
  router.get('/content/available-content', availableContentHandler)
  router.post('/content/entities', multipartParserWrapper(entitiesHandler))

  return router
}
