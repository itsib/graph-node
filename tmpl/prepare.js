const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
require('dotenv').config({path: path.resolve(`${__dirname}/../.env`)});

const DEPLOY_ACCESS_TOKEN = process.env.SUBGRAPH_DEPLOY_ACCESS_TOKEN || 'super-secret-bearer-token';
const DB_USER = process.env.SUBGRAPH_DB_USER || 'graph-node';
const DB_PASSWORD = process.env.SUBGRAPH_DB_PASSWORD || 'let_me_in';
const INDEX_NODE_PREFIX = 'graph_indexed_node';
const QUERY_NODE_PREFIX = 'graph_query_node';

const configFile = path.resolve(`${__dirname}/../config.json`);
const dockerComposeTmplFile = path.resolve(`${__dirname}/docker-compose.mustache`);
const nodesConfigTmplFile = path.resolve(`${__dirname}/nodes-config.mustache`);

if (!fs.existsSync(configFile)) {
  console.error('ERR: File config.json do not exist');
  process.exit(-1);
}
if (!fs.existsSync(dockerComposeTmplFile)) {
  console.error('ERR: File docker-compose.mustache do not exist');
  process.exit(-1);
}
if (!fs.existsSync(nodesConfigTmplFile)) {
  console.error('ERR: File nodes-config.mustache not exist');
  process.exit(-1);
}

const dockerComposeTmpl = fs.readFileSync(dockerComposeTmplFile, 'utf-8');
const nodesConfigTmpl = fs.readFileSync(nodesConfigTmplFile, 'utf-8');

const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
config.deployAccessToken = DEPLOY_ACCESS_TOKEN;
config.dbUser = DB_USER;
config.dbPassword = DB_PASSWORD;

handlebars.registerHelper('prefix', function (name, type) {
  return `${'query' === type ? QUERY_NODE_PREFIX : INDEX_NODE_PREFIX}_${name}`;
});

let portsCount = 0;
handlebars.registerHelper('metricPort', function () {
  const portNumber = `${portsCount++}`;
  return `9${'0'.repeat(3-portNumber.length)}${portNumber}`;
});

fs.writeFileSync(path.resolve(`${__dirname}/../docker-compose.yml`), handlebars.compile(dockerComposeTmpl)(config));
fs.writeFileSync(path.resolve(`${__dirname}/../nodes-conf/config.toml`), handlebars.compile(nodesConfigTmpl)(config));
