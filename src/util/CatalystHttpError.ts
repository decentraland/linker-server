import { isErrorWithMessage } from '@dcl/core-commons'

/**
 * Error representing an HTTP failure returned by a Catalyst endpoint.
 */
export class CatalystHttpError extends Error {
  status: number
  rawResponse?: string

  constructor(status: number, message: string, rawResponse?: string) {
    super(message)
    this.status = status
    this.rawResponse = rawResponse
  }

  /**
   * Attempts to convert any unknown error into a CatalystHttpError when possible.
   * Returns null if it cannot confidently determine status/message.
   */
  static fromUnknown(error: unknown): CatalystHttpError | null {
    if (!error) return null

    const message = isErrorWithMessage(error) ? error.message : String(error)

    const explicitStatus =
      typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
        ? error.status
        : undefined
    if (explicitStatus) {
      return new CatalystHttpError(explicitStatus, message)
    }

    return null
  }

  /**
   * Builds a CatalystHttpError from a non-2xx HTTP response (status + raw body),
   * extracting a friendly message from the body when possible.
   */
  static fromResponse(status: number, rawBody: string): CatalystHttpError {
    return new CatalystHttpError(status, CatalystHttpError.extractFriendlyMessage(rawBody), rawBody)
  }

  /**
   * Best-effort extraction of a user-friendly message from a JSON or text payload.
   */
  private static extractFriendlyMessage(raw: string): string {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.errors) && parsed.errors.length > 0) {
        return parsed.errors.join('; ')
      }
      if (typeof parsed?.message === 'string' && parsed.message.length > 0) {
        return parsed.message
      }
    } catch {
      // not JSON, fall back to raw text
    }
    return raw
  }
}
