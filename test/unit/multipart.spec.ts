import type { IHttpServerComponent } from '@dcl/core-commons'
import { InvalidRequestError } from '@dcl/http-commons'
import { type FormDataContext, multipartParserWrapper } from '../../src/util/multipart'

describe('when parsing a multipart request with multipartParserWrapper', () => {
  function buildContext(
    body: BodyInit,
    headers?: Record<string, string>
  ): IHttpServerComponent.DefaultContext<unknown> {
    const request = new Request('http://localhost/content/entities', { method: 'POST', body, headers })
    return { request } as unknown as IHttpServerComponent.DefaultContext<unknown>
  }

  describe('and the request is valid multipart form data', () => {
    let form: FormData

    beforeEach(() => {
      form = new FormData()
      form.append('entityId', 'bafkreiexample')
      form.append('bafkreifile', new Blob([Buffer.from('file contents')]), 'bafkreifile')
    })

    it('should pass the parsed fields and files to the wrapped handler and return its response', async () => {
      let received: FormDataContext<unknown> | undefined
      const handler = jest.fn(async (ctx: FormDataContext<unknown>) => {
        received = ctx
        return { status: 200 }
      })

      const response = await multipartParserWrapper(handler)(buildContext(form))

      expect(response).toEqual({ status: 200 })
      expect(handler).toHaveBeenCalledTimes(1)
      expect(received?.formData.fields.entityId.value).toBe('bafkreiexample')
      expect(received?.formData.files.bafkreifile.fieldname).toBe('bafkreifile')
      expect(received?.formData.files.bafkreifile.value.toString()).toBe('file contents')
    })
  })

  describe('and the request is not valid multipart data', () => {
    it('should reject without invoking the handler', async () => {
      const handler = jest.fn()
      const ctx = buildContext(JSON.stringify({ not: 'multipart' }), { 'content-type': 'application/json' })

      await expect(multipartParserWrapper(handler)(ctx)).rejects.toBeInstanceOf(InvalidRequestError)
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('and the request has no body', () => {
    it('should reject without invoking the handler', async () => {
      const handler = jest.fn()
      const ctx = {
        request: new Request('http://localhost/content/entities', { method: 'GET' })
      } as unknown as IHttpServerComponent.DefaultContext<unknown>

      await expect(multipartParserWrapper(handler)(ctx)).rejects.toThrow('Missing multipart request body')
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('and a file exceeds the configured size limit', () => {
    it('should reject without invoking the handler', async () => {
      const form = new FormData()
      form.append('bigfile', new Blob([Buffer.alloc(1024)]), 'bigfile')
      const handler = jest.fn()

      await expect(multipartParserWrapper(handler, { limits: { fileSize: 8 } })(buildContext(form))).rejects.toThrow(
        'exceeds the maximum allowed size'
      )
      expect(handler).not.toHaveBeenCalled()
    })
  })
})
