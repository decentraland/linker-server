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

  // Matches: "Failed to fetch <url>. Got status <code>. Response was '<json or text>'"
  private static readonly FETCH_ERROR_RE =
    /^Failed to fetch\s+\S+\. Got status\s+(\d{3})\. Response was '([\s\S]+)'$/

  /**
   * Tries to parse a known "Failed to fetch ..." error message from the Catalyst client
   * and convert it into a CatalystHttpError with a friendly message.
   */
  static parseFromMessage(message: string): CatalystHttpError | null {
    const match = message.match(CatalystHttpError.FETCH_ERROR_RE)
    if (!match) return null

    const status = parseInt(match[1], 10)
    const rawStr = match[2]
    const friendly = CatalystHttpError.extractFriendlyMessage(rawStr)

    return new CatalystHttpError(isNaN(status) ? 500 : status, friendly, rawStr)
  }

  /**
   * Attempts to convert any unknown error into a CatalystHttpError when possible.
   * Returns null if it cannot confidently determine status/message.
   */
  static fromUnknown(error: unknown): CatalystHttpError | null {
    if (!error) return null

    const message = typeof (error as any)?.message === 'string' ? (error as any).message : String(error)
    const parsed = CatalystHttpError.parseFromMessage(message)
    if (parsed) return parsed

    const explicitStatus = typeof (error as any)?.status === 'number' ? (error as any).status : undefined
    if (explicitStatus) {
      return new CatalystHttpError(explicitStatus, message)
    }

    return null
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


