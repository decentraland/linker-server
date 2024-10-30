import 'dotenv/config'
import express, { NextFunction, Response, Request } from 'express'
import { AuthChain, LinkerAuthorization } from '@dcl/schemas'
import { Authenticator } from '@dcl/crypto'
import { fetch } from 'undici'
import multer from 'multer'
import { readFile } from 'fs/promises'
import cors from 'cors'
import FormData from 'form-data'

import { addModelToFormData } from 'dcl-catalyst-client'
import { postForm } from 'dcl-catalyst-commons'
import { verifyMessage } from '@ethersproject/wallet'
import { Wallet } from '@ethersproject/wallet'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

let wallet = new Wallet('0x0000000000000000000000000000000000000000000000000000000000000001')
const ENVIRONMENT = process.env.ENVIRONMENT || 'stg'
let db: { [address: string]: string[] } = {}
const PORT = 3000

const upload = multer({ dest: 'distFiles/', preservePath: true })

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json() as any)

function errorHandler(error: unknown, _req: Request, res: Response, next: NextFunction) {
  console.error('Errored', error)
  if (res.headersSent) {
    return next(error)
  }
  res.status(500).json({ message: error })
}

app.get('/health/ready', (_req, res) => {
  res.status(200).send('ready')
})
app.get('/health/startup', (_req, res) => {
  res.status(200).send('[server] ok')
})
app.get('/health/live', (_req, res) => {
  res.status(200).send('alive')
})

app.get('/about', (req, res) => {
  const url = req.hostname

  res.status(200).json({
    acceptingUsers: true,
    bff: { healthy: false, publicUrl: `${url}/bff` },
    comms: {
      healthy: true,
      protocol: 'v3',
      fixedAdapter: `offline:offline`
    },
    configurations: {
      networkId: 0,
      globalScenesUrn: [],
      scenesUrn: [],
      realmName: 'LinkerServer'
    },
    content: {
      healthy: true,
      publicUrl: `${url}/content`
    },
    lambdas: {
      healthy: true,
      publicUrl: `${url}/lambdas`
    },
    healthy: true
  })
})

app.get('/content/available-content', async (req, res, next) => {
  try {
    const response = await fetch(`https://${process.env.CATALYST_DOMAIN!}/` + req.url)
    const text = await response.text()
    for (const header of response.headers) {
      if (header[0].startsWith('content-type')) res.setHeader(header[0], header[1])
      if (header[0].startsWith('access-control-')) res.setHeader(header[0], header[1])
    }
    res.status(response.status).end(text)
  } catch (error) {
    next(error)
  }
})

app.post('/content/entities', upload.any(), async (req, res, done) => {
  try {
    console.log('/content/entities')
    const auth: AuthChain = JSON.parse(JSON.stringify(req.body.authChain))

    if (!Authenticator.isValidAuthChain(auth)) {
      return res.status(403).json({ message: 'No AuthChain SIGNER' })
    }
    const signerAddress = Authenticator.ownerAddress(auth)
    const dbSigner = db[signerAddress.toLowerCase()]
    console.log('/content/entities -> Singer found in authorizations list?', signerAddress)

    if (!dbSigner) return res.status(403).send('Address not found')

    const authSignedEntity = auth.find((a) => a.type === 'ECDSA_SIGNED_ENTITY')
    if (!authSignedEntity?.signature) return res.status(403).send('No signature')

    const address = verifyMessage(authSignedEntity.payload, authSignedEntity.signature)

    if (address.toString().toLowerCase() != signerAddress.toLowerCase()) {
      console.log(
        'Deployed entity could not get validated: addresses do not match',
        address.toString().toLowerCase(),
        signerAddress.toLowerCase()
      )
      return res.status(403).send("Address don't match")
    }

    const entityFile = JSON.parse(JSON.stringify(req.files)).find((a: any) => a.originalname == req.body.entityId)
    const entity = await readFile(entityFile.path).then((r) => JSON.parse(r.toString()))

    const missingAccess = entity.pointers.filter((pointer: string) => dbSigner.indexOf(pointer) == -1)
    if (missingAccess.length > 0) {
      console.log('Missing access to:')
      console.log(JSON.stringify(missingAccess))
      return res.status(403).send(`Missing access for ${missingAccess.length} parcels:\n${missingAccess.join('; ')}`)
    }

    const form = new FormData()
    form.append('entityId', req.body.entityId)
    const sig = await wallet.signMessage(req.body.entityId)

    // You can then create a simple auth chain like this, or a more complex one.
    const authChain = Authenticator.createSimpleAuthChain(req.body.entityId, wallet.address.toString(), sig)

    addModelToFormData(JSON.parse(JSON.stringify(authChain)), form, 'authChain')
    for (const file of <any>req.files) {
      await form.append(file.fieldname, await readFile(file.path), file.fieldname)
      console.log(`Appending file as ${file.fieldname}`)
    }

    res.setHeader('X-Extend-CF-Timeout', 10)
    const ret = await postForm(`https://${process.env.CATALYST_DOMAIN!}/content/entities`, {
      body: form as any,
      headers: { 'x-upload-origin': 'dcl_linker' },
      timeout: '10m'
    })
    console.log('Catalyst post response', ret)
    res.send(ret).end()
  } catch (error: any) {
    done(error)
  }
})

app.use(errorHandler)

async function updateDB() {
  try {
    console.log('Updating authorizations data - Start')
    const res = await fetch('https://decentraland.github.io/linker-server-authorizations/authorizations.json')
    const json = await res.json()
    console.log('Updating authorizations data - Fetched')
    db = convertAuthorizationsToList(json as any)
    console.log('Updating authorizations data - Addresses', Object.keys(db))
  } catch (error) {
    console.error('Updating authorizations data error', error)
  }
}

setInterval(updateDB, 10 * 60 * 1000)

function validatePlot(plot: string): boolean {
  const split = plot.split(',')
  if (split.length != 2) return false
  const x = +split[0]
  const y = +split[1]
  if (isNaN(x) || isNaN(y)) return false
  if (x < -200 || x > 200 || y < -200 || y > 200) return false
  return true
}

function convertAuthorizationsToList(authorizations: Authorizations): AuthorizationsList {
  const list: AuthorizationsList = {}

  for (const authorization of authorizations) {
    if (authorization.startDate && +new Date(authorization.startDate) > +new Date()) continue
    if (authorization.endDate && +new Date(authorization.endDate) < +new Date()) continue
    if (authorization.onlyDev && ENVIRONMENT === 'prd') continue

    for (const address of authorization.addresses) {
      const add = address.toLowerCase()
      if (!list[add]) list[add] = []
      for (const plot of authorization.plots) {
        if (validatePlot(plot)) list[add].push(plot)
      }
    }
  }

  return list
}

type Authorizations = LinkerAuthorization[]

type AuthorizationsList = {
  [address: string]: string[]
}

async function main() {
  // const SMClient = new SecretsManagerClient({ region: 'us-east-1' })
  // const command = new GetSecretValueCommand({ SecretId: 'linker-server' })
  // const response = await SMClient.send(command)
  // const json = JSON.parse(response.SecretString!)
  // wallet = new Wallet(json.private_key)

  await updateDB()

  app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`)
  })
}

void main()
