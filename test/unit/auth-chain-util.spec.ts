import type { AuthChain } from '@dcl/schemas'
import { parseAuthChainFromFields } from '../../src/util/auth-chain'

type FormFields = Record<string, { fieldname: string; value: string }>

describe('when parsing auth chain from form fields', () => {
  let fields: FormFields
  let result: AuthChain | null

  describe('and no auth chain fields are present', () => {
    beforeEach(() => {
      fields = {
        entityId: { fieldname: 'entityId', value: 'bafkreiexample' }
      }
      result = parseAuthChainFromFields(fields)
    })

    it('should return null', () => {
      expect(result).toBeNull()
    })
  })

  describe('and auth chain fields are present', () => {
    describe('and there is a single auth link', () => {
      beforeEach(() => {
        fields = {
          'authChain[0][type]': { fieldname: 'authChain[0][type]', value: 'SIGNER' },
          'authChain[0][payload]': { fieldname: 'authChain[0][payload]', value: '0x1234567890abcdef' },
          'authChain[0][signature]': { fieldname: 'authChain[0][signature]', value: '' }
        }
        result = parseAuthChainFromFields(fields)
      })

      it('should parse the one auth link correctly', () => {
        expect(result).toEqual([{ type: 'SIGNER', payload: '0x1234567890abcdef', signature: '' }])
      })
    })

    describe('and there are multiple auth links', () => {
      beforeEach(() => {
        fields = {
          'authChain[0][type]': { fieldname: 'authChain[0][type]', value: 'SIGNER' },
          'authChain[0][payload]': { fieldname: 'authChain[0][payload]', value: '0xsigner' },
          'authChain[0][signature]': { fieldname: 'authChain[0][signature]', value: '' },
          'authChain[1][type]': { fieldname: 'authChain[1][type]', value: 'ECDSA_EPHEMERAL' },
          'authChain[1][payload]': { fieldname: 'authChain[1][payload]', value: 'ephemeral payload' },
          'authChain[1][signature]': { fieldname: 'authChain[1][signature]', value: '0xsig1' },
          'authChain[2][type]': { fieldname: 'authChain[2][type]', value: 'ECDSA_SIGNED_ENTITY' },
          'authChain[2][payload]': { fieldname: 'authChain[2][payload]', value: 'bafkreientity' },
          'authChain[2][signature]': { fieldname: 'authChain[2][signature]', value: '0xsig2' }
        }
        result = parseAuthChainFromFields(fields)
      })

      it('should parse the three auth links correctly', () => {
        expect(result).toEqual([
          { type: 'SIGNER', payload: '0xsigner', signature: '' },
          { type: 'ECDSA_EPHEMERAL', payload: 'ephemeral payload', signature: '0xsig1' },
          { type: 'ECDSA_SIGNED_ENTITY', payload: 'bafkreientity', signature: '0xsig2' }
        ])
      })
    })

    describe('and the fields are in non-sequential order', () => {
      beforeEach(() => {
        fields = {
          'authChain[2][type]': { fieldname: 'authChain[2][type]', value: 'THIRD' },
          'authChain[2][payload]': { fieldname: 'authChain[2][payload]', value: 'third' },
          'authChain[2][signature]': { fieldname: 'authChain[2][signature]', value: '' },
          'authChain[0][type]': { fieldname: 'authChain[0][type]', value: 'FIRST' },
          'authChain[0][payload]': { fieldname: 'authChain[0][payload]', value: 'first' },
          'authChain[0][signature]': { fieldname: 'authChain[0][signature]', value: '' },
          'authChain[1][type]': { fieldname: 'authChain[1][type]', value: 'SECOND' },
          'authChain[1][payload]': { fieldname: 'authChain[1][payload]', value: 'second' },
          'authChain[1][signature]': { fieldname: 'authChain[1][signature]', value: '' }
        }
        result = parseAuthChainFromFields(fields)
      })

      it('should still parse them in the correct order', () => {
        expect(result).toEqual([
          { type: 'FIRST', payload: 'first', signature: '' },
          { type: 'SECOND', payload: 'second', signature: '' },
          { type: 'THIRD', payload: 'third', signature: '' }
        ])
      })
    })

    describe('and there are other fields mixed in', () => {
      beforeEach(() => {
        fields = {
          entityId: { fieldname: 'entityId', value: 'bafkreiexample' },
          'authChain[0][type]': { fieldname: 'authChain[0][type]', value: 'SIGNER' },
          'authChain[0][payload]': { fieldname: 'authChain[0][payload]', value: '0xaddr' },
          'authChain[0][signature]': { fieldname: 'authChain[0][signature]', value: '' },
          someOtherField: { fieldname: 'someOtherField', value: 'ignored' }
        }
        result = parseAuthChainFromFields(fields)
      })

      it('should only parse the auth chain fields', () => {
        expect(result).toEqual([{ type: 'SIGNER', payload: '0xaddr', signature: '' }])
      })
    })
  })
})
