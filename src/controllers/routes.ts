import { errorHandler } from '@dcl/http-commons'
import { Router } from '@dcl/http-server'
import { aboutHandler } from './handlers/about-handler'
import { availableContentHandler } from './handlers/available-content-handler'
import { entitiesHandler } from './handlers/entities-handler'
import { pingHandler } from './handlers/ping-handler'
import { multipartParserWrapper } from '../util/multipart'
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
