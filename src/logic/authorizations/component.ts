import type { IConfigComponent, IFetchComponent, ILoggerComponent } from '@well-known-components/interfaces'
import { isErrorWithMessage } from '@dcl/core-commons'
import type { LinkerAuthorization } from '@dcl/schemas'
import type {
  AuthorizationCheckResult,
  AuthorizationsList,
  IAuthorizationsComponent,
  ParcelAccessResult
} from './types'

/**
 * Creates the Authorizations component
 *
 * Handles authorization data management:
 * 1. Fetches authorizations from the GitHub repository
 * 2. Converts authorizations to a lookup list
 * 3. Provides authorization checking methods
 *
 * @param components Required components: config, fetcher, logs
 * @returns IAuthorizationsComponent implementation
 */
export async function createAuthorizationsComponent(components: {
  config: IConfigComponent
  fetcher: IFetchComponent
  logs: ILoggerComponent
}): Promise<IAuthorizationsComponent> {
  const { config, fetcher, logs } = components
  const logger = logs.getLogger('authorizations-component')

  let db: AuthorizationsList = {}

  const environment = (await config.getString('ENVIRONMENT')) ?? 'stg'
  const authorizationsUrl =
    (await config.getString('AUTHORIZATIONS_URL')) ??
    'https://decentraland.github.io/linker-server-authorizations/authorizations.json'

  /**
   * Validates a plot coordinate string
   */
  function validatePlot(plot: string): boolean {
    const split = plot.split(',')
    if (split.length !== 2) return false
    const x = +split[0]
    const y = +split[1]
    if (isNaN(x) || isNaN(y)) return false
    if (x < -200 || x > 200 || y < -200 || y > 200) return false
    return true
  }

  /**
   * Converts raw authorizations to a lookup list
   */
  function convertAuthorizationsToList(authorizations: LinkerAuthorization[]): AuthorizationsList {
    const list: AuthorizationsList = {}

    for (const authorization of authorizations) {
      if (authorization.startDate && +new Date(authorization.startDate) > +new Date()) continue
      if (authorization.endDate && +new Date(authorization.endDate) < +new Date()) continue
      if (authorization.onlyDev && environment === 'prd') continue

      for (const address of authorization.addresses) {
        const add = address.toLowerCase()
        if (!list[add]) list[add] = []
        for (const plot of authorization.plots) {
          if (validatePlot(plot)) list[add].push(plot)
        }
      }
    }

    return list
  }

  /**
   * Updates the authorizations data from the remote source
   */
  async function updateAuthorizations(): Promise<void> {
    try {
      logger.debug('Updating authorizations data - Start')
      const res = await fetcher.fetch(authorizationsUrl)
      const json = (await res.json()) as LinkerAuthorization[]
      logger.debug('Updating authorizations data - Fetched')
      db = convertAuthorizationsToList(json)
      logger.info('Updating authorizations data - Complete', { addresses: Object.keys(db).length })
    } catch (error) {
      const errorMessage = isErrorWithMessage(error) ? error.message : 'Unknown error'
      logger.error('Updating authorizations data error', { error: errorMessage })
    }
  }

  /**
   * Checks if an address is authorized
   *
   * @param address - The Ethereum address to check
   * @returns Authorization check result
   */
  async function checkAuthorization(address: string): Promise<AuthorizationCheckResult> {
    const parcels = db[address.toLowerCase()]
    if (!parcels) {
      return { authorized: false }
    }
    return { authorized: true, parcels }
  }

  /**
   * Checks if an address has access to specific parcels
   *
   * @param address - The Ethereum address to check
   * @param pointers - The parcel pointers to check access for
   * @returns Parcel access result
   */
  async function checkParcelAccess(address: string, pointers: string[]): Promise<ParcelAccessResult> {
    const authorizedParcels = db[address.toLowerCase()]
    if (!authorizedParcels) {
      return { hasAccess: false, missingParcels: pointers }
    }

    const missingParcels = pointers.filter((pointer) => !authorizedParcels.includes(pointer))
    return {
      hasAccess: missingParcels.length === 0,
      missingParcels
    }
  }

  // Initial update on component creation
  await updateAuthorizations()

  return {
    updateAuthorizations,
    checkAuthorization,
    checkParcelAccess
  }
}
