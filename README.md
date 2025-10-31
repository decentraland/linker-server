# Linker server

The linker server is used to publish scenes on the Decentraland Foundation's lands without having owner or manager permissions over those lands via the contract. The service grabs an authorization's list from the [Linker Server Authorization](https://github.com/decentraland/linker-server-authorizations) repository to allow publishing scenes only to previously accepted wallets.

## How it works

### Downloading authorized wallets

The service updates the authorized wallets and the plots they're authorized to deploy in through a polling process. There's no need to redeploy the service once the list is changed.

### Deploying scenes

The deployment of scenes is done by signing the deployed entity first using the [Linked dApp UI](https://github.com/decentraland/linker-dapp) or any other UI.

The process goes as follows:

1. The user explicitly sets the linker server url as the Catalyst where they're going to deploy the scene.
2. The user signs the entity related to the scene that they want to deploy.
3. The linker server will check that the signed entity belongs to an authorized wallet and that this wallet can deploy scenes to the coordinates it needs to.
4. The linker server will re-sign the entities using a secret wallet with permissions and publish it to the Catalyst.

The service will deploy the scenes in different Catalysts depending on the environment they're in.

## 🤖 AI Agent Context

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
