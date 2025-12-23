import type { HandlerContextWithPath } from '../../types'

// handlers arguments only type what they need, to make unit testing easier
export async function pingHandler(
  context: Pick<HandlerContextWithPath<'metrics', '/ping'>, 'url' | 'components'>
): Promise<{ body: string }> {
  const {
    url,
    components: { metrics }
  } = context

  metrics.increment('linker_ping_counter', {
    pathname: url.pathname
  })

  return {
    body: url.pathname
  }
}
