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

## AI Agent Context

For detailed AI Agent context, see [docs/ai-agent-context.md](docs/ai-agent-context.md).