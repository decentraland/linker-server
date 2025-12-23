import { Wallet } from '@ethersproject/wallet'
import { addModelToFormData } from 'dcl-catalyst-client'
import { postForm } from 'dcl-catalyst-commons'
import FormData from 'form-data'
import type { IConfigComponent, ILoggerComponent } from '@well-known-components/interfaces'
import { isErrorWithMessage } from '@dcl/core-commons'
import { Authenticator } from '@dcl/crypto'
import { type AuthChain, AuthLinkType } from '@dcl/schemas'
import { CatalystHttpError } from '../../util/CatalystHttpError'
import type { ILinkerComponent, UploadFiles, UploadResult, ValidationResult } from './types'
import type { ISecretsComponent } from '../../adapters/secrets'

/**
 * Creates the Linker component
 *
 * Handles entity validation and uploading:
 * 1. Validates auth chains
 * 2. Signs entities with the server wallet
 * 3. Uploads entities to the Catalyst
 *
 * @param components Required components: config, logs, secrets
 * @returns ILinkerComponent implementation
 */
export async function createLinkerComponent(components: {
  config: IConfigComponent
  logs: ILoggerComponent
  secrets: ISecretsComponent
}): Promise<ILinkerComponent> {
  const { config, logs, secrets } = components
  const logger = logs.getLogger('linker-component')

  const [catalystDomain, awsSecretId] = await Promise.all([
    config.requireString('CATALYST_DOMAIN'),
    config.requireString('AWS_SECRET_ID')
  ])

  /**
   * Validates an auth chain signature
   *
   * @param authChain - The auth chain to validate
   * @returns Validation result with signer address if valid
   */
  async function validateAuthChain(authChain: AuthChain): Promise<ValidationResult> {
    const authSignedEntity = authChain.find((a) => a.type === AuthLinkType.ECDSA_PERSONAL_SIGNED_ENTITY)
    if (!authSignedEntity?.signature) {
      return { ok: false, signerAddress: '', error: 'No signature' }
    }

    const validationResult = await Authenticator.validateSignature(
      authSignedEntity.payload,
      authChain,
      null as unknown as Parameters<typeof Authenticator.validateSignature>[2]
    )

    if (!validationResult.ok) {
      return { ok: false, signerAddress: '', error: 'Invalid signature' }
    }

    const signerAddress = Authenticator.ownerAddress(authChain)
    return { ok: true, signerAddress }
  }

  /**
   * Uploads an entity to the Catalyst
   *
   * @param entityId - The entity ID
   * @param files - The files to upload (from multipart form data)
   * @returns Upload result
   */
  async function uploadToCatalyst(entityId: string, files: UploadFiles): Promise<UploadResult> {
    try {
      // Get secret and create wallet
      const secretString = await secrets.getSecret(awsSecretId)
      const secretJson = JSON.parse(secretString)
      const wallet = new Wallet(secretJson.private_key)

      const form = new FormData()

      form.append('entityId', entityId)

      // Sign the entity with the server wallet
      const sig = await wallet.signMessage(entityId)
      const authChain = Authenticator.createSimpleAuthChain(entityId, wallet.address.toString(), sig)
      addModelToFormData(JSON.parse(JSON.stringify(authChain)), form, 'authChain')

      // Append all files from the multipart form data
      for (const [filename, file] of Object.entries(files)) {
        form.append(filename, file.value, filename)
        logger.debug(`Appending file as ${filename}`)
      }

      logger.info('Uploading to Catalyst', { catalystDomain, entityId })

      const ret = await postForm(`https://${catalystDomain}/content/entities`, {
        body: form as unknown as globalThis.FormData,
        headers: { 'x-upload-origin': 'dcl_linker', 'X-Extend-CF-Timeout': '600' },
        timeout: '10m'
      })

      logger.info('Catalyst post response', { response: JSON.stringify(ret) })

      return { success: true, response: ret }
    } catch (error) {
      const errorMessage = isErrorWithMessage(error) ? error.message : 'Unknown error'
      logger.error('Error uploading to Catalyst', { error: errorMessage })

      // Convert known Catalyst error message into a structured HttpError
      const parsed = CatalystHttpError.fromUnknown(error)
      if (parsed) {
        return { success: false, status: parsed.status, error: parsed.message }
      }

      return { success: false, error: errorMessage }
    }
  }

  return {
    validateAuthChain,
    uploadToCatalyst
  }
}
