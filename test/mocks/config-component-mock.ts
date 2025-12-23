import type { IConfigComponent } from '@well-known-components/interfaces'

export function createConfigMockedComponent(
  partial?: Partial<jest.Mocked<IConfigComponent>>
): jest.Mocked<IConfigComponent> {
  return {
    getString: jest.fn(),
    getNumber: jest.fn(),
    requireString: jest.fn(),
    requireNumber: jest.fn(),
    ...partial
  }
}
