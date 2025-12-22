# Linker Server

The Linker Server enables authorized users to deploy scenes to Decentraland Foundation-owned lands without requiring contract ownership or manager permissions. It acts as a proxy Catalyst that validates authorizations and re-signs entities with a privileged wallet.

## Table of Contents

- [Features](#features)
- [Dependencies & Related Services](#dependencies--related-services)
- [API Documentation](#api-documentation)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Service](#running-the-service)

## Features

- **Authorization Validation**: Validates user authorization against an approved wallet list fetched from the [linker-server-authorizations](https://github.com/decentraland/linker-server-authorizations) repository.
- **Parcel Access Control**: Verifies that parcel coordinates match the authorized deployment plots for each wallet.
- **Entity Re-signing**: Re-signs scene entities using a privileged wallet with Foundation land permissions.
- **Catalyst Publishing**: Publishes re-signed entities to Foundation Catalyst nodes.
- **Dynamic Authorization Updates**: Polls the authorization repository periodically for updated wallet/plot lists without requiring redeployment.

## Dependencies & Related Services

This service interacts with the following dependencies or services:

- **[linker-server-authorizations](https://github.com/decentraland/linker-server-authorizations)**: Provides the list of authorized wallets and their permitted deployment plots.
- **[Linked dApp UI](https://github.com/decentraland/linker-dapp)**: Frontend application for users to sign entities before deployment.
- **Foundation Catalyst Nodes**: Final deployment destination for scene entities.
- **AWS Secrets Manager**: Stores the privileged wallet private key used for re-signing entities.
- **Ethereum Wallet**: A wallet with Foundation land permissions for entity re-signing.

## API Documentation

The API is fully documented using the [OpenAPI standard](https://swagger.io/specification/). The schema is located at [docs/openapi.yaml](docs/openapi.yaml).

## Getting Started

### Prerequisites

Before running this service, ensure you have the following installed:

- **Node.js**: Version 18.x or higher (LTS recommended)
- **npm**: Version 8.x or higher
- **Docker**: For containerized building and running (optional)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/decentraland/linker-server.git
cd linker-server
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

### Configuration

The service uses environment variables for configuration. Create a `.env` file in the root directory:

| Variable          | Description                             | Default                         |
| ----------------- | --------------------------------------- | ------------------------------- |
| `ENVIRONMENT`     | Deployment environment (`stg` or `prd`) | `stg`                           |
| `CATALYST_DOMAIN` | Target Catalyst domain for publishing   | `peer-testing.decentraland.org` |

The service also requires access to AWS Secrets Manager to retrieve the privileged wallet's private key (secret name: `linker-server`).

### Running the Service

#### Running in development mode

To run the service in development mode:

```bash
npm start
```

The server will start on port 3000.

#### Running with Docker

Build the Docker image:

```bash
docker build -t linker-server .
```

Run the container:

```bash
docker run -p 3000:3000 -e ENVIRONMENT=stg -e AWS_REGION=us-east-1 linker-server
```

## Deployment workflow

To understand a bit more how the deployment workflow works, see

## AI Agent Context

For detailed AI Agent context, see the [🤖 AI Agent Context](#-ai-agent-context-1) section below.
