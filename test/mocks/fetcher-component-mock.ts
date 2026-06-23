import type { IFetchComponent } from '@dcl/core-commons'

export function createFetcherMockedComponent(
  partial?: Partial<jest.Mocked<IFetchComponent>>
): jest.Mocked<IFetchComponent> {
  return {
    fetch: jest.fn(),
    ...partial
  }
}
