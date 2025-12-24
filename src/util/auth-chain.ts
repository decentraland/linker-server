import type { AuthChain, AuthLink } from '@dcl/schemas'

interface FormField {
  fieldname: string
  value: string
}

type FormFields = Record<string, FormField>

/**
 * Parses an AuthChain from multipart form data fields.
 *
 * The form data comes in the format:
 * - authChain[0][type]: 'SIGNER'
 * - authChain[0][payload]: '0x...'
 * - authChain[0][signature]: ''
 * - authChain[1][type]: 'ECDSA_EPHEMERAL'
 * - ...etc
 *
 * This function reconstructs the AuthChain array from these fields.
 *
 * @param fields - The form data fields object
 * @returns The parsed AuthChain array, or null if no auth chain fields are found
 */
export function parseAuthChainFromFields(fields: FormFields): AuthChain | null {
  const authChainRegex = /^authChain\[(\d+)\]\[(\w+)\]$/
  const authLinks: Map<number, Partial<AuthLink>> = new Map()

  for (const [key, field] of Object.entries(fields)) {
    const match = key.match(authChainRegex)
    if (!match) continue

    const index = parseInt(match[1], 10)
    const property = match[2] as keyof AuthLink

    if (!authLinks.has(index)) {
      authLinks.set(index, {})
    }

    const link = authLinks.get(index) ?? {}
    ;(link as Record<string, string>)[property] = field.value
  }

  if (authLinks.size === 0) {
    return null
  }

  // Convert map to sorted array
  const sortedIndices = Array.from(authLinks.keys()).sort((a, b) => a - b)
  const authChain: AuthChain = sortedIndices.map((index) => authLinks.get(index) as AuthLink)

  return authChain
}
