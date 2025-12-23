import { getDefaultHttpMetrics } from '@well-known-components/http-server'
import { IMetricsComponent } from '@well-known-components/interfaces'
import { metricDeclarations as logsMetricsDeclarations } from '@well-known-components/logger'
import { validateMetricsDeclaration } from '@well-known-components/metrics'

export const metricDeclarations = {
  ...getDefaultHttpMetrics(),
  ...logsMetricsDeclarations,
  linker_ping_counter: {
    help: 'Count calls to ping',
    type: IMetricsComponent.CounterType,
    labelNames: ['pathname']
  },
  linker_entity_upload_counter: {
    help: 'Count entity upload requests',
    type: IMetricsComponent.CounterType,
    labelNames: ['status']
  }
}

// type assertions
validateMetricsDeclaration(metricDeclarations)
