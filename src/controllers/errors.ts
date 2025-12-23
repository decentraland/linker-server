/**
 * Error thrown when a user is forbidden from performing an action
 */
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
  }
}
