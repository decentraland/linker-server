import type { ILinkerComponent } from '../../src/logic/linker'

export function createLinkerMockedComponent(
  partial?: Partial<jest.Mocked<ILinkerComponent>>
): jest.Mocked<ILinkerComponent> {
  return {
    validateAuthChain: jest.fn(),
    uploadToCatalyst: jest.fn(),
    ...partial
  }
}
