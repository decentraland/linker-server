import { Readable } from 'stream'
import busboy from 'busboy'
import type { IHttpServerComponent } from '@dcl/core-commons'
import type { FieldInfo, FileInfo } from 'busboy'

/**
 * A non-file multipart field.
 */
export type Field = FieldInfo & {
  fieldname: string
  value: string
}

/**
 * A file multipart field, with its contents buffered into `value`.
 */
export type File = FileInfo & {
  fieldname: string
  value: Buffer
}

/**
 * A handler context enriched with parsed multipart form data.
 */
export type FormDataContext<T> = IHttpServerComponent.DefaultContext<T> & {
  formData: {
    fields: Record<string, Field>
    files: Record<string, File>
  }
}

/**
 * Wraps a handler so it receives parsed `multipart/form-data` on `ctx.formData`.
 *
 * This mirrors `@well-known-components/multipart-wrapper`, but that package pipes
 * `ctx.request.body` straight into busboy, which only works with the legacy
 * node-fetch body (a Node stream). `@dcl/http-server` exposes the native (undici)
 * request body as a WHATWG `ReadableStream`, so we adapt it with `Readable.fromWeb`
 * before piping. There is no native `@dcl/*` multipart wrapper to migrate to.
 */
export function multipartParserWrapper<U, Ctx extends FormDataContext<U>, T extends IHttpServerComponent.IResponse>(
  handler: (ctx: Ctx) => Promise<T>
): (ctx: IHttpServerComponent.DefaultContext<U>) => Promise<T> {
  return async function (ctx) {
    const formDataParser = busboy({
      headers: {
        'content-type': ctx.request.headers.get('content-type') || undefined
      }
    })

    const fields: Record<string, Field> = {}
    const files: Record<string, File> = {}

    const finished = new Promise<void>((ok, err) => {
      formDataParser.on('error', err)
      formDataParser.on('finish', () => ok())
    })

    formDataParser.on('field', function (name, value, info) {
      fields[name] = { fieldname: name, value, ...info }
    })

    formDataParser.on('file', function (name, stream, info) {
      const chunks: Buffer[] = []
      stream.on('data', (data) => chunks.push(data))
      stream.on('error', (err) => console.error('stream error', err))
      stream.on('end', () => {
        files[name] = { ...info, fieldname: name, value: Buffer.concat(chunks) }
      })
    })

    // Adapt the native WHATWG request body into a Node stream so busboy can consume it.
    Readable.fromWeb(ctx.request.body as Parameters<typeof Readable.fromWeb>[0]).pipe(formDataParser)

    const newContext = Object.assign(Object.create(ctx), { formData: { fields, files } }) as Ctx
    await finished
    return handler(newContext)
  }
}
