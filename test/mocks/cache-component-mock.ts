import type { ICacheStorageComponent } from '@dcl/core-commons'

export function createCacheMockedComponent(
  partial?: Partial<jest.Mocked<ICacheStorageComponent>>
): jest.Mocked<ICacheStorageComponent> {
  return {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    keys: jest.fn(),
    setInHash: jest.fn(),
    getFromHash: jest.fn(),
    removeFromHash: jest.fn(),
    getAllHashFields: jest.fn(),
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
    tryAcquireLock: jest.fn(),
    tryReleaseLock: jest.fn(),
    ...partial
  }
}
