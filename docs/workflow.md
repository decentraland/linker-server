# Deployment workflow

## Authorization list

1. The service polls the [linker-server-authorizations](https://github.com/decentraland/linker-server-authorizations) repository every 10 minutes for the latest authorized wallets and plots.

## Deployment flow

1. The user signs an entity using the [Linked dApp UI](https://github.com/decentraland/linker-dapp) or any compatible UI.
2. The user deploys to this linker server by setting it as their Catalyst endpoint.
3. The server validates:
   - The signature in the auth chain is valid
   - The signer's wallet address is in the authorized list
   - All target parcels are authorized for the signer
4. The server re-signs the entity with the Foundation's privileged wallet.
5. The server publishes the re-signed entity to the configured Catalyst.

```
User (Linked dApp) → Linker Server → Foundation Catalyst
       │                  │
       │ 1. Sign entity   │ 2. Validate authorization
       │                  │ 3. Re-sign with privileged wallet
       │                  │ 4. Forward to Catalyst
       └──────────────────┴────────────────────────────────→
```
