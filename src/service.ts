import type { Lifecycle } from '@well-known-components/interfaces'
import { setupRouter } from './controllers/routes'
import type { AppComponents, GlobalContext, TestComponents } from './types'

export async function main(program: Lifecycle.EntryPointParameters<AppComponents | TestComponents>): Promise<void> {
  const { components, startComponents } = program
  const globalContext: GlobalContext = {
    components
  }

  // wire the HTTP router
  const router = await setupRouter(globalContext)
  // register routes middleware
  components.server.use(router.middleware())
  // register not implemented/method not allowed/cors responses middleware
  components.server.use(router.allowedMethods())
  // set the context to be passed to the handlers
  components.server.setContext(globalContext)

  await startComponents()
}
