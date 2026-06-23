import { errorHandler } from '@dcl/http-commons'
import { Router } from '@dcl/http-server'
import { aboutHandler } from './handlers/about-handler'
import { availableContentHandler } from './handlers/available-content-handler'
import { entitiesHandler } from './handlers/entities-handler'
import { pingHandler } from './handlers/ping-handler'
import { multipartParserWrapper } from '../util/multipart'
import type { GlobalContext } from '../types'

// Generous-but-finite defaults so a malicious/oversized upload can't exhaust memory
// (the endpoint buffers files in memory). Tune via env to match the catalyst's own limits.
const DEFAULT_MAX_UPLOAD_FILE_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB per file
const DEFAULT_MAX_UPLOAD_FILE_COUNT = 500
const DEFAULT_MAX_UPLOAD_FIELD_COUNT = 100
const DEFAULT_MAX_UPLOAD_FIELD_SIZE_BYTES = 100 * 1024 // 100 KB per field (auth-chain fields are small)

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(context: GlobalContext): Promise<Router<GlobalContext>> {
  const { config } = context.components
  const router = new Router<GlobalContext>()

  // A configured value of 0 (or negative) is treated as "use the default" rather than busboy's
  // literal 0-byte/0-count limit, which would reject every upload.
  const positiveNumberOrDefault = async (key: string, fallback: number): Promise<number> => {
    const value = await config.getNumber(key)
    return value !== undefined && value > 0 ? value : fallback
  }

  const uploadLimits = {
    fileSize: await positiveNumberOrDefault('MAX_UPLOAD_FILE_SIZE_BYTES', DEFAULT_MAX_UPLOAD_FILE_SIZE_BYTES),
    files: await positiveNumberOrDefault('MAX_UPLOAD_FILE_COUNT', DEFAULT_MAX_UPLOAD_FILE_COUNT),
    fields: await positiveNumberOrDefault('MAX_UPLOAD_FIELD_COUNT', DEFAULT_MAX_UPLOAD_FIELD_COUNT),
    fieldSize: await positiveNumberOrDefault('MAX_UPLOAD_FIELD_SIZE_BYTES', DEFAULT_MAX_UPLOAD_FIELD_SIZE_BYTES)
  }

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
  router.post('/content/entities', multipartParserWrapper(entitiesHandler, { limits: uploadLimits }))

  return router
}
