export interface AuthorizationsList {
  [address: string]: string[]
}

export interface AuthorizationCheckResult {
  authorized: boolean
  parcels?: string[]
}

export interface ParcelAccessResult {
  hasAccess: boolean
  missingParcels: string[]
}

export interface IAuthorizationsComponent {
  /**
   * Forces an update of the authorizations data
   */
  updateAuthorizations: () => Promise<void>

  /**
   * Checks if an address is authorized
   *
   * @param address - The Ethereum address to check
   * @returns Authorization check result
   */
  checkAuthorization: (address: string) => Promise<AuthorizationCheckResult>

  /**
   * Checks if an address has access to specific parcels
   *
   * @param address - The Ethereum address to check
   * @param pointers - The parcel pointers to check access for
   * @returns Parcel access result
   */
  checkParcelAccess: (address: string, pointers: string[]) => Promise<ParcelAccessResult>
}
