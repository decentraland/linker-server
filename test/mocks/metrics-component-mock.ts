import type { IMetricsComponent } from '@well-known-components/interfaces'
import type { metricDeclarations } from '../../src/metrics'

type MetricsKeys = keyof typeof metricDeclarations

export function createMetricsMockedComponent(
  partial?: Partial<jest.Mocked<IMetricsComponent<MetricsKeys>>>
): jest.Mocked<IMetricsComponent<MetricsKeys>> {
  return {
    increment: jest.fn(),
    decrement: jest.fn(),
    observe: jest.fn(),
    getValue: jest.fn(),
    reset: jest.fn(),
    resetAll: jest.fn(),
    startTimer: jest.fn(),
    ...partial
  } as jest.Mocked<IMetricsComponent<MetricsKeys>>
}
