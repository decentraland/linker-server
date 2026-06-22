import type { IHttpServerComponent } from '@dcl/core-commons'
import { isErrorWithMessage } from '@dcl/core-commons'
import { InvalidRequestError } from '@dcl/http-commons'
import { parseAuthChainFromFields } from '../../util/auth-chain'
import { ForbiddenError } from '../errors'
import type { FormHandlerContextWithPath } from '../../types'

/**
 * Handler for the POST /content/entities endpoint
 *
 * Validates authorization and proxies entity uploads to the Catalyst
 *
 * @param context - The request context containing form data and components
 * @returns Upload result or error response
 */
export async function entitiesHandler(
  context: FormHandlerContextWithPath<'logs' | 'metrics' | 'authorizations' | 'linker', '/content/entities'>
): Promise<IHttpServerComponent.IResponse> {
  const {
    formData,
    components: { logs, metrics, authorizations, linker }
  } = context

  const logger = logs.getLogger('entities-handler')

  try {
    logger.info('POST: /content/entities')

    // Parse the auth chain from the form data fields
    const authChain = parseAuthChainFromFields(formData.fields)
    if (!authChain || authChain.length === 0) {
      throw new ForbiddenError('No auth chain provided')
    }

    // Validate the signature
    const validationResult = await linker.validateAuthChain(authChain)
    if (!validationResult.ok) {
      throw new ForbiddenError('Invalid auth chain')
    }

    // Check authorization
    const signerAddress = validationResult.signerAddress
    const authorizationResult = await authorizations.checkAuthorization(signerAddress)
    if (!authorizationResult.authorized) {
      throw new ForbiddenError('Address not authorized to deploy scenes')
    }

    logger.info('Signer found in authorizations list', { signerAddress })

    // Get the entity ID
    const entityIdField = formData.fields.entityId
    if (!entityIdField) {
      throw new InvalidRequestError('Missing entity id field in the form data')
    }

    const entityId = entityIdField.value

    // Ensure the signed payload matches the entity being deployed. Without this
    // check a captured auth chain (which signs its own entityId) could be replayed
    // to deploy arbitrary content under an authorized signer.
    if (validationResult.signedEntityId !== entityId) {
      throw new ForbiddenError('Auth chain payload does not match the entity id')
    }

    // Get the entity file
    const entityFile = formData.files[entityId]
    if (!entityFile) {
      throw new InvalidRequestError('Missing entity file')
    }

    const entityContent = entityFile.value.toString('utf-8')
    const entity = JSON.parse(entityContent)

    // Check parcel access
    const accessResult = await authorizations.checkParcelAccess(signerAddress, entity.pointers)
    if (!accessResult.hasAccess) {
      throw new ForbiddenError(
        `Missing access for ${accessResult.missingParcels.length} parcels:\n${accessResult.missingParcels.join('; ')}`
      )
    }

    // Upload to Catalyst
    const uploadResult = await linker.uploadToCatalyst(entityId, formData.files)

    if (!uploadResult.success) {
      // Reflect the catalyst's status (e.g. a 400 "entity already deployed") back to the
      // client instead of collapsing every upstream rejection into a 500.
      const status = uploadResult.status ?? 500
      const message = uploadResult.error ?? 'Upload failed'
      logger.warn('Catalyst rejected the entity upload', { status, error: message })
      metrics.increment('linker_entity_upload_counter', { status: 'error' })
      return {
        status,
        body: { error: 'Catalyst upload failed', message }
      }
    }

    metrics.increment('linker_entity_upload_counter', { status: 'success' })

    return {
      status: 200,
      body: uploadResult.response as unknown as IHttpServerComponent.IResponse['body']
    }
  } catch (error) {
    const errorMessage = isErrorWithMessage(error) ? error.message : 'Unknown error'

    if (error instanceof ForbiddenError) {
      logger.warn('Forbidden error in entity upload', { error: errorMessage })
      metrics.increment('linker_entity_upload_counter', { status: 'forbidden' })
      return {
        status: 403,
        body: { error: 'Forbidden', message: error.message }
      }
    }

    if (error instanceof InvalidRequestError) {
      logger.warn('Invalid request in entity upload', { error: errorMessage })
      metrics.increment('linker_entity_upload_counter', { status: 'invalid_request' })
      return {
        status: 400,
        body: { error: 'Bad request', message: error.message }
      }
    }

    logger.error('Error handling entity upload', { error: errorMessage })
    metrics.increment('linker_entity_upload_counter', { status: 'error' })

    return {
      status: 500,
      body: { error: 'Internal server error', message: errorMessage }
    }
  }
}
