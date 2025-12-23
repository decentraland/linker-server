import type { IAuthorizationsComponent } from '../../src/logic/authorizations'

export function createAuthorizationsMockedComponent(
  partial?: Partial<jest.Mocked<IAuthorizationsComponent>>
): jest.Mocked<IAuthorizationsComponent> {
  return {
    updateAuthorizations: jest.fn(),
    checkAuthorization: jest.fn(),
    checkParcelAccess: jest.fn(),
    ...partial
  }
}
