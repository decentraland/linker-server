export class CatalystHttpError extends Error {
  status: number
  rawResponse?: string

  constructor(status: number, message: string, rawResponse?: string) {
    super(message)
    this.status = status
    this.rawResponse = rawResponse
  }

  static parseFromMessage(message: string): CatalystHttpError | null {
    // Matches: Failed to fetch <url>. Got status <code>. Response was '<json or text>'
    const re = /^Failed to fetch\s+\S+\. Got status\s+(\d{3})\. Response was '([\s\S]+)'$/
    const m = message.match(re)
    if (!m) return null
    const status = parseInt(m[1], 10)
    const rawStr = m[2]
    let cleanMessage = rawStr
    try {
      const parsed = JSON.parse(rawStr)
      if (parsed && Array.isArray(parsed.errors) && parsed.errors.length > 0) {
        cleanMessage = parsed.errors.join('; ')
      } else if (typeof parsed.message === 'string' && parsed.message.length > 0) {
        cleanMessage = parsed.message
      }
    } catch {
      // keep rawStr as message
    }
    return new CatalystHttpError(isNaN(status) ? 500 : status, cleanMessage, rawStr)
  }

  static fromUnknown(error: unknown): CatalystHttpError | null {
    if (!error) return null
    const sourceMessage = typeof (error as any)?.message === 'string' ? (error as any).message : String(error)
    const parsed = CatalystHttpError.parseFromMessage(sourceMessage)
    if (parsed) return parsed
    const explicitStatus = typeof (error as any)?.status === 'number' ? (error as any).status : undefined
    if (explicitStatus && typeof sourceMessage === 'string') {
      return new CatalystHttpError(explicitStatus, sourceMessage)
    }
    return null
  }
}


