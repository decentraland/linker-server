# AI Agent Context

**Service Purpose:**

Enables authorized users to deploy scenes to Decentraland Foundation-owned lands without requiring contract ownership or manager permissions. Acts as a proxy Catalyst that validates authorizations and re-signs entities with a privileged wallet.

**Key Capabilities:**

- Validates user authorization against an approved wallet list fetched from the linker-server-authorizations repository
- Verifies parcel coordinates match authorized deployment plots for each wallet
- Re-signs scene entities using a privileged wallet with Foundation land permissions
- Publishes re-signed entities to Foundation Catalyst nodes
- Polls authorization repository every 10 minutes for updated wallet/plot lists
- Proxies content availability requests to the upstream Catalyst
- Exposes Catalyst-compatible endpoints (`/about`, `/content/entities`) to work with existing deployment tools

**Communication Pattern:**

Synchronous HTTP REST API using Express. Receives deployment requests as multipart/form-data, processes them, and forwards to Foundation Catalysts.

**Technology Stack:**

- Runtime: Node.js 18+
- Language: TypeScript
- HTTP Framework: Express
- Authentication: @dcl/crypto (Authenticator for signature validation)
- Ethereum: @ethersproject/wallet (for entity re-signing)
- HTTP Client: undici (for fetching authorizations and proxying)
- Form Handling: multer (multipart uploads), form-data (outgoing forms)
- Catalyst Integration: dcl-catalyst-client, dcl-catalyst-commons

**External Dependencies:**

- **linker-server-authorizations**: GitHub Pages-hosted JSON file containing authorized wallets and their permitted plots (`https://decentraland.github.io/linker-server-authorizations/authorizations.json`)
- **Foundation Catalyst**: Target Catalyst server for publishing (configurable via `CATALYST_DOMAIN` env var)
- **AWS Secrets Manager**: Stores the privileged wallet private key (secret name: `linker-server`, region: `us-east-1`)

**Key Concepts:**

- **AuthChain**: An array of authentication links that cryptographically proves ownership. Contains `SIGNER` (wallet address), optional `ECDSA_EPHEMERAL` (delegated key), and `ECDSA_SIGNED_ENTITY` (the actual signature over the entity ID).
- **Entity**: A Decentraland content unit (scene) identified by its content hash (`entityId`). Contains `pointers` (parcel coordinates like `"-10,20"`) that specify where the scene deploys.
- **Pointers**: Parcel coordinates in the format `"x,y"` (e.g., `"-10,20"`). Valid range is -200 to 200 for both x and y coordinates.
- **Re-signing Flow**: The server validates the user's signature, then creates a new `AuthChain` signed by the Foundation's privileged wallet before forwarding to the Catalyst.
- **Authorization Entry**: A JSON object with `addresses` (array of wallet addresses), `plots` (array of coordinate strings), optional `startDate`/`endDate` for time-bounded access, and `onlyDev` flag to restrict to non-production environments.

**Configuration:**

- `ENVIRONMENT`: `stg` (staging) or `prd` (production). Affects which authorization entries apply (`onlyDev` entries are skipped in production).
- `CATALYST_DOMAIN`: The Catalyst server domain to publish to (default: `peer-testing.decentraland.org`).
- Port: Hardcoded to `3000`.

**Authorization Logic:**

1. Authorizations are fetched and converted to a lookup map: `{ [walletAddress]: [allowedPlots] }`
2. Time-bounded entries (`startDate`/`endDate`) are filtered based on current time
3. `onlyDev` entries are excluded when `ENVIRONMENT=prd`
4. Invalid plot coordinates (outside -200 to 200 range) are filtered out
5. On deployment, all entity pointers must exist in the signer's allowed plots list

**Error Handling:**

- `403` responses for authorization failures (invalid signature, unknown wallet, missing parcel access)
- `CatalystHttpError` class parses and wraps upstream Catalyst errors for cleaner error messages
- Temporary files (uploaded content) are cleaned up in `finally` block after processing

**File Structure:**

- `src/index.ts`: Main application with all routes and business logic
- `src/util/CatalystHttpError.ts`: Error wrapper for Catalyst upstream errors
- `distFiles/`: Temporary storage for uploaded entity files (cleaned up after processing)
