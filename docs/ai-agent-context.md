# AI Agent Context

**Service Purpose:** Enables authorized users to deploy scenes to Decentraland Foundation-owned lands without requiring contract ownership or manager permissions. Acts as a proxy Catalyst that validates authorizations and re-signs entities with a privileged wallet.

**Key Capabilities:**

- Validates user authorization against approved wallet list (from linker-server-authorizations repository)
- Verifies parcel coordinates match authorized deployment plots
- Re-signs scene entities using privileged wallet with Foundation land permissions
- Publishes re-signed entities to Foundation Catalysts
- Polls authorization repository for updated wallet/plot lists
- Supports deployment to different Catalyst environments per configuration

**Communication Pattern:** Synchronous HTTP REST API (receives deployment requests)

**Technology Stack:**

- Runtime: Node.js
- Language: TypeScript
- HTTP Framework: Express or @well-known-components/http-server
- Component Architecture: @well-known-components (logger, metrics)

**External Dependencies:**

- Authorization Source: linker-server-authorizations GitHub repository (authorized wallets and plots)
- Content Servers: Foundation Catalyst nodes (final deployment destination)
- Crypto: Ethereum wallet with Foundation land permissions (re-signing)

**Authorization Flow:**

1. Service polls linker-server-authorizations repo for authorized wallets and plots
2. User signs entity via Linked dApp UI
3. User deploys to linker server (specified as Catalyst endpoint)
4. Server validates: wallet is authorized AND coordinates match authorized plots
5. Server re-signs entity with privileged wallet
6. Server publishes to Foundation Catalyst nodes
