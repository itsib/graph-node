const express = require('express');
const { Client } = require('pg');
const fs = require('fs');
const toml = require('toml');
const fetch = require('node-fetch');

const app = express();
const { PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE, GRAPH_NODE_CONFIG } = process.env;
const PORT = process.env.PORT || 8080;

/**
 * RPC URLs to check node current block.
 * @type {{bsc: string, kovan: string, matic: string, rinkeby: string, mainnet: string, goerli: string, ropsten: string}}
 */
const PUBLIC_RPC = {
  mainnet: 'https://main-rpc.linkpool.io',
  ropsten: 'https://ropsten.infura.io/v3/a4ceed48e86948ab835e6512025ddad4',
  rinkeby: 'https://rinkeby-light.eth.linkpool.io',
  goerli: 'https://goerli-light.eth.linkpool.io',
  kovan: 'https://kovan.infura.io/v3/a4ceed48e86948ab835e6512025ddad4',
  matic: 'https://rpc-mainnet.maticvigil.com',
  bsc: 'https://bsc-dataseed.binance.org',
};

if (!fs.existsSync(GRAPH_NODE_CONFIG)) {
  console.error('GRAPH_NODE_CONFIG should be available file path');
  process.exit(-1);
}

let graphConfig;
try {
  graphConfig = toml.parse(fs.readFileSync(GRAPH_NODE_CONFIG, 'utf-8'));
} catch (e) {
  console.error('Can\'t parse toml file.');
  process.exit(-1);
}

const client = new Client({
  host: PG_HOST,
  port: PG_PORT,
  user: PG_USER,
  password: PG_PASSWORD,
  database: PG_DATABASE,
});

client.connect()
  .then(async () => {
    console.log('DB Connected.')

    app.listen(PORT, () => {
      console.log(`Explorer listening at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    client.end();
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

app.use(express.static('public'));

app.get('/api/subgraphs', async (req, res) => {
  const { rows: subgraphs } = await client.query('SELECT * FROM subgraphs.subgraph ORDER BY subgraphs.subgraph.vid');
  const { rows: subgraphsVersions } = await client.query('SELECT * FROM subgraphs.subgraph_version');

  const result = subgraphs.map(subgraph => {
    const currentVersion = subgraph.current_version ? subgraphsVersions.find(i => i.id === subgraph.current_version) : undefined;
    return {
      id: subgraph.id,
      name: subgraph.name,
      deployment: currentVersion ? currentVersion.deployment : null,
      createdAt: Number(subgraph.created_at),
      updatedAt: currentVersion ? Number(currentVersion.created_at) : Number(subgraph.created_at),
    }
  });
  return res.json(result);
});

app.get('/api/head-blocks', async (req, res) => {
  try {
    const chains = Object.keys(graphConfig.chains).filter(key => typeof graphConfig.chains[key] === 'object');

    const latestBlocks = await Promise.all(chains.map(chain => {
      const url = PUBLIC_RPC[chain];
      if (!url) {
        return Promise.resolve({
          network: chain,
          block: null,
          error: `Chain "${chain}" not provided RPC url`,
        });
      }

      const conf = {
        method: 'POST',
        body: '{"method":"eth_blockNumber","params":[],"id":1,"jsonrpc":"2.0"}',
        headers: {'Content-Type': 'application/json'}
      }
      return fetch(url, conf)
        .then(response => {
          if (response.ok) {
            return response.json();
          } else {
            return Promise.reject(new Error(`Status code ${response.status}`));
          }
        })
        .then(data => {
          return Promise.resolve({
            network: chain,
            block: parseInt(data.result, 16),
            error: null,
          });
        })
        .catch(err => {
          console.error(err);
          return Promise.resolve({
            network: chain,
            block: null,
            error: `Chain "${chain}" rpc call error ${err.message}`,
          });
        })
    }));

    return res.json(latestBlocks);
  } catch (e) {
    console.error(e);
    return res.status(500).send(e.message);
  }
});
