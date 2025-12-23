# AI Agent Context

**Service Purpose:**

The Linker Server acts as an intermediary for deploying content to Decentraland's Catalyst network. It validates authorization for specific parcels and proxies upload requests to the Catalyst content server with server-signed authentication.

**Key Capabilities:**

- Authorization validation for parcel deployments
- Auth chain signature verification
- Entity upload proxying to Catalyst
- Health check endpoints

**Communication Pattern:**

HTTP REST API

**Technology Stack:**

- Runtime: Node.js
- Language: TypeScript
- Framework: Well-Known Components (WKC) architecture
- HTTP Server: @well-known-components/http-server

**External Dependencies:**

- AWS Secrets Manager (for server wallet private key)
- Decentraland Catalyst (for content deployment)
- GitHub Pages (for authorization data)

**Key Concepts:**

- **Auth Chain**: A chain of signed messages that proves ownership of a wallet address
- **Parcel Authorization**: Users must be pre-authorized to deploy to specific parcels
- **Entity Upload**: Content entities are signed by the server and forwarded to Catalyst

**Database notes:**

- No persistent database - authorization data is fetched periodically from GitHub Pages


