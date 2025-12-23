import type { AuthChain } from '@dcl/schemas'

export interface ValidationResult {
  ok: boolean
  signerAddress: string
  error?: string
}

export interface UploadResult {
  success: boolean
  response?: unknown
  status?: number
  error?: string
}

export type UploadFiles = Record<
  string,
  {
    fieldname: string
    value: Buffer
  }
>

export interface ILinkerComponent {
  /**
   * Validates an auth chain signature
   *
   * @param authChain - The auth chain to validate
   * @returns Validation result with signer address if valid
   */
  validateAuthChain: (authChain: AuthChain) => Promise<ValidationResult>

  /**
   * Uploads an entity to the Catalyst
   *
   * @param entityId - The entity ID
   * @param files - The files to upload (from multipart form data)
   * @returns Upload result
   */
  uploadToCatalyst: (entityId: string, files: UploadFiles) => Promise<UploadResult>
}
