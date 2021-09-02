const express = require('express');
const { Client } = require('pg');

const app = express();
const { PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE } = process.env;
const PORT = process.env.PORT || 8080;

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
  res.json(result);
});
