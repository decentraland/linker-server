import type { IFetchComponent } from '@well-known-components/interfaces'

export function createFetcherMockedComponent(
  partial?: Partial<jest.Mocked<IFetchComponent>>
): jest.Mocked<IFetchComponent> {
  return {
    fetch: jest.fn(),
    ...partial
  }
}
