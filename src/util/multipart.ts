import { Readable } from 'stream'
import busboy, { type FieldInfo, type FileInfo, type Limits } from 'busboy'
import type { IHttpServerComponent } from '@dcl/core-commons'
import { InvalidRequestError } from '@dcl/http-commons'

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

export interface MultipartOptions {
  /** busboy size/count limits. The endpoint buffers files in memory, so a caller should always
   * pass bounds to avoid an unbounded-upload memory-exhaustion DoS. */
  limits?: Limits
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
  handler: (ctx: Ctx) => Promise<T>,
  options: MultipartOptions = {}
): (ctx: IHttpServerComponent.DefaultContext<U>) => Promise<T> {
  return async function (ctx) {
    if (!ctx.request.body) {
      throw new InvalidRequestError('Missing multipart request body')
    }

    const formDataParser = busboy({
      headers: {
        'content-type': ctx.request.headers.get('content-type') || undefined
      },
      limits: options.limits
    })

    const fields: Record<string, Field> = {}
    const files: Record<string, File> = {}

    // Capture the reject so a source/file stream error can settle the parse from outside
    // busboy's own event flow (calling busboy.destroy() inside its events corrupts its state).
    let rejectFinished!: (err: unknown) => void
    const finished = new Promise<void>((resolve, reject) => {
      rejectFinished = reject
      formDataParser.on('error', reject)
      formDataParser.on('finish', resolve)
    })

    // When a configured limit is exceeded busboy truncates/stops and still emits 'finish';
    // record it and throw after parsing rather than destroying busboy mid-event.
    let limitError: InvalidRequestError | undefined
    const flagLimit = (message: string) => {
      limitError ??= new InvalidRequestError(message)
    }
    formDataParser.on('filesLimit', () => flagLimit('Too many files in the upload'))
    formDataParser.on('fieldsLimit', () => flagLimit('Too many fields in the upload'))
    formDataParser.on('partsLimit', () => flagLimit('Too many parts in the upload'))

    formDataParser.on('field', function (name, value, info) {
      fields[name] = { fieldname: name, value, ...info }
    })

    formDataParser.on('file', function (name, stream, info) {
      const chunks: Buffer[] = []
      stream.on('data', (data) => chunks.push(data))
      // A file exceeding `limits.fileSize` would otherwise be silently truncated; reject instead.
      stream.on('limit', () => flagLimit(`File "${name}" exceeds the maximum allowed size`))
      // Surface file-stream errors so the parse rejects instead of silently dropping the file.
      stream.on('error', (err) => rejectFinished(err))
      stream.on('end', () => {
        files[name] = { ...info, fieldname: name, value: Buffer.concat(chunks) }
      })
    })

    // Adapt the native WHATWG request body into a Node stream so busboy can consume it.
    const source = Readable.fromWeb(ctx.request.body as Parameters<typeof Readable.fromWeb>[0])
    // `pipe` does NOT forward source errors to the destination, so handle them explicitly:
    // without this, a client aborting mid-upload leaves the source 'error' unhandled (the
    // process runs with --abort-on-uncaught-exception) and busboy never emits 'finish'/'error',
    // hanging `await finished`.
    source.on('error', (err) => rejectFinished(err))
    source.pipe(formDataParser)

    const newContext = Object.assign(Object.create(ctx), { formData: { fields, files } }) as Ctx
    await finished
    if (limitError) {
      throw limitError
    }
    return handler(newContext)
  }
}
