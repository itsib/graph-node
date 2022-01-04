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
**SUBGRAPH_DEPLOY_ACCESS_TOKEN** Used in 
```graph auth [options] <node> <access-token>```
for deployment subgraphs.

The config.json file is used to configure the environment.
```json5
{
  "maxApiVersion": "0.0.3",
  "baseHttpUrl": "http://localhost:4000",
  "baseWsUrl": "ws://localhost:4000/ws",
  "queryNode": "default",
  "defaultIndexedNode": "default",
  "indexedNodes": [
    {
      "name": "kovan",
      "rpc": ["https://kovan.infura.io/v3/a4ceed48e86948ab835e6512025ddad4"]
    }
  ]
}
```

**maxApiVersion** - Maximum apiVersion supported, if a developer tries to create a subgraph with a higher apiVersion than this in their mappings, they'll receive an error. Defaults to 0.0.6.

**baseHttpUrl** - Subgraph queries endpoint

**baseWsUrl** - Subgraph websocket queries endpoint

**queryNode** - Query node name

**defaultIndexedNode** - Default indexed node name (Used as deployment node)

**indexedNodes** - Indexed nodes foreach chain id

### Commands
 
```npm run nodes:start``` Runs environment subgraph nodes

```npm run nodes:start:local``` Runs environment subgraph nodes used config.local.json

```npm run nodes:stop``` Stop environment subgraph nodes

```npm run nodes:restart``` Restart subgraph nodes.
