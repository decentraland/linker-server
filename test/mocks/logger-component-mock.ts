import type { ILoggerComponent } from '@well-known-components/interfaces'

export function createLogsMockedComponent({
  log = jest.fn(),
  debug = jest.fn(),
  error = jest.fn(),
  info = jest.fn(),
  warn = jest.fn()
}: Partial<jest.Mocked<ReturnType<ILoggerComponent['getLogger']>>> = {}): jest.Mocked<ILoggerComponent> {
  return {
    getLogger: jest.fn().mockReturnValue({
      log,
      debug,
      error,
      info,
      warn
    })
  }
}
