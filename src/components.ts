import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import { createFetchComponent } from '@well-known-components/fetch-component'
import { Verbosity, instrumentHttpServerWithRequestLogger } from '@well-known-components/http-requests-logger-component'
import {
  createServerComponent,
  createStatusCheckComponent,
  instrumentHttpServerWithPromClientRegistry
} from '@well-known-components/http-server'
import { createHttpTracerComponent } from '@well-known-components/http-tracer-component'
import { createLogComponent } from '@well-known-components/logger'
import { createMetricsComponent } from '@well-known-components/metrics'
import { createTracerComponent } from '@well-known-components/tracer-component'
import { createJobComponent } from '@dcl/job-component'
import { createInMemoryCacheComponent } from '@dcl/memory-cache-component'
import { createSecretsComponent } from './adapters/secrets'
import { createAuthorizationsComponent } from './logic/authorizations'
import { createLinkerComponent } from './logic/linker'
import { metricDeclarations } from './metrics'
import type { AppComponents, GlobalContext } from './types'

// Initialize all the components of the app
export async function initComponents(): Promise<AppComponents> {
  const config = await createDotEnvConfigComponent({ path: ['.env.default', '.env'] })

  const updateIntervalMs = await config.requireNumber('AUTHORIZATIONS_UPDATE_INTERVAL_MS')

  const metrics = await createMetricsComponent(metricDeclarations, { config })
  const tracer = await createTracerComponent()
  const fetcher = createFetchComponent()
  const logs = await createLogComponent({ metrics, tracer })
  const server = await createServerComponent<GlobalContext>({ config, logs }, {})
  const statusChecks = await createStatusCheckComponent({ server, config })
  const cache = createInMemoryCacheComponent()

  const secrets = await createSecretsComponent({ config, logs, cache })

  const authorizations = await createAuthorizationsComponent({ config, fetcher, logs })
  const linker = await createLinkerComponent({ config, logs, secrets })

  // Create job to periodically update authorizations
  const authorizationsUpdaterJob = createJobComponent(
    { logs },
    () => authorizations.updateAuthorizations(),
    updateIntervalMs
  )

  createHttpTracerComponent({ server, tracer })
  instrumentHttpServerWithRequestLogger({ server, logger: logs }, { verbosity: Verbosity.INFO })

  if (!metrics.registry) {
    throw new Error('Metrics registry is not initialized')
  }

  await instrumentHttpServerWithPromClientRegistry({ metrics, server, config, registry: metrics.registry })

  return {
    config,
    logs,
    server,
    metrics,
    fetcher,
    cache,
    statusChecks,
    secrets,
    authorizations,
    linker,
    authorizationsUpdaterJob
  }
}
