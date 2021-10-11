# The Graph Nodes

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/itsib/graph-node/blob/master/LICENSE.md)

The Graph is a protocol for building decentralized applications (dApps) quickly on Ethereum and IPFS using GraphQL.

## Quick Start

### Prerequisites

To build and run this project you need to have the following installed on your system:

- Node (^14.17.3) – [Install](https://nodejs.org/en/)
- Docker (^19.03.8) – [Install](https://docs.docker.com/engine/install/)
- Docker Compose (^1.25.4) – [Install](https://docs.docker.com/compose/install/)

### Configuration

Create an .env file with the contents:
```dotenv
SUBGRAPH_DEPLOY_ACCESS_TOKEN="super-secret-bearer-token"
SUBGRAPH_DB_USER="graph-node"
SUBGRAPH_DB_PASSWORD="let_me_in"
```
