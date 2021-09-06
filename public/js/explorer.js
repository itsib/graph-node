Number.prototype.pad = function(n) {
  return (new Array(n).join('0') + this).slice((Math.max(n, this.toString().length)) * -1);
}

async function fetchSubgraphs() {
  const res = await fetch('/api/subgraphs');

  if (!res.ok) {
    throw new Error(`Fetch Error code ${res.status}`);
  }

  return res.json();
}

async function fetchHeadBlocks() {
  const res = await fetch('/api/head-blocks');

  if (!res.ok) {
    throw new Error(`Fetch Error code ${res.status}`);
  }

  return res.json();
}

async function fetchFullSubgraphs(subgraphs, headBlocks) {
  const query = `query indexingStatuses ($subgraphs: [String!]) {
    indexingStatuses (subgraphs: $subgraphs) {
      subgraph
      synced
      health
      entityCount
      node
      chains {
        network
        chainHeadBlock {
          number
        }
        earliestBlock {
          number
        }
        latestBlock {
          number
        }
        lastHealthyBlock {
          number
        }
      }
      fatalError {
        message
        block {
          number
        }
        handler
      }
      nonFatalErrors {
        message
        block {
          number
        }
        handler
      }
    }
  }`;

  const res = await fetch('/graphql', {
    body: JSON.stringify({
      query: query.replace(/\s+/g, ' '),
      variables: {
        subgraphs: subgraphs.map(i => i.deployment).filter(Boolean),
      },
    }),
    method: 'POST',
    mode: 'cors',
  });

  if (!res.ok) {
    throw new Error(`Error fetch full subgraphs info. Error code ${res.status}`);
  }

  const result = await res.json();
  if (result.errors || !result.data) {
    throw new Error(result.errors && result.errors[0] && result.errors[0].message ? result.errors[0].message : 'Error fetch full subgraphs info. Response error');
  }

  const indexingStatuses = result.data.indexingStatuses || [];

  return subgraphs.map(subgraph => {
    const indexingStatus = subgraph.deployment ? indexingStatuses.find(i => i.subgraph === subgraph.deployment) : null;
    const chainIndexingInfo = indexingStatus && indexingStatus.chains && indexingStatus.chains[0];
    const networkName = chainIndexingInfo ? chainIndexingInfo.network : null;
    const headBlock = networkName ? headBlocks.find(i => i.network === networkName) : null;

    return Object.assign({}, subgraph, {
      chain: {
        name: chainIndexingInfo ? chainIndexingInfo.network : null,
        headBlock: chainIndexingInfo && chainIndexingInfo.chainHeadBlock ? Number(chainIndexingInfo.chainHeadBlock.number) : null,
        realHeadBlock: headBlock ? headBlock.block : null,
      },
      indexing: !chainIndexingInfo ? null : {
        start: Number(chainIndexingInfo.earliestBlock.number),
        current: Number(chainIndexingInfo.latestBlock.number),
        lastHealthy: chainIndexingInfo.lastHealthyBlock ? Number(chainIndexingInfo.lastHealthyBlock.number) : null,
        finished: !!indexingStatus.synced,
      },
      health: indexingStatus ? indexingStatus.health : null,
      entityCount: indexingStatus ? Number(indexingStatus.entityCount) : null,
      nodeId: indexingStatus ? indexingStatus.node : null,
      fatalError: indexingStatus && indexingStatus.fatalError || null,
      nonFatalErrors: indexingStatus && indexingStatus.nonFatalErrors || [],
    });
  });
}

function showError(message) {
  const errorBlock = document.getElementById('error-block');
  errorBlock.style.display = 'block';

  const errorMessage = document.getElementById('error-message');
  errorMessage.innerHTML = message;
}

function dateFormat(date) {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).pad(2);
  const day = date.getUTCDate().pad(2);
  const hours = date.getUTCHours().pad(2);
  const minutes = date.getUTCMinutes().pad(2);
  const seconds = date.getUTCSeconds().pad(2);

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

function renderSubgraphs(fullSubgraphs) {
  const template = document.getElementById('subgraph-row-tmpl');

  fullSubgraphs.forEach(fullSubgraph => {
    const existedElement = document.getElementById(fullSubgraph.id);
    let row;
    if (existedElement) {
      row = existedElement;
    } else {
      const clone = template.content.cloneNode(true);
      row = clone.querySelector('.subgraph-row');
      row.id = fullSubgraph.id;
      template.parentNode.appendChild(clone);
    }

    let progress = 0;
    if (fullSubgraph.indexing && fullSubgraph.chain && fullSubgraph.indexing.start && fullSubgraph.indexing.current && fullSubgraph.chain.headBlock) {
      const total = fullSubgraph.chain.headBlock - fullSubgraph.indexing.start;
      const indexed = fullSubgraph.indexing.current - fullSubgraph.indexing.start;

      if (total > 0) {
        progress = +(indexed / (total / 100)).toFixed(2);
      }
    }

    let status = 'failed';
    if (!fullSubgraph.health || !fullSubgraph.indexing) {
      status = 'wait-deploy';
    } else if (fullSubgraph.health === 'healthy') {
      status = fullSubgraph.indexing.finished ? 'healthy' : 'pending';
    }

    const chainName = fullSubgraph.chain ? fullSubgraph.chain.name : null;
    const chainIcon = new Image();
    switch (chainName) {
      case 'matic':
        chainIcon.src = '/images/polygon.svg';
        break;
      case 'bsc':
        chainIcon.src = '/images/binance.svg';
        break;
      default:
        chainIcon.src = '/images/ethereum.svg';
        break;
    }

    const nameNode = row.querySelector('.subgraph-name');
    const progressNode = row.querySelector('.subgraph-progress');
    const chainIconNode = row.querySelector('.subgraph-chain-icon');
    const chainNameNode = row.querySelector('.subgraph-chain-name');
    const statusNode = row.querySelector('.subgraph-status');
    const legendNode = row.querySelector('.subgraph-legend');
    const legendStartNode = row.querySelector('.subgraph-start-block');
    const legendCurrentNode = row.querySelector('.subgraph-current-block');
    const legendHeadNode = row.querySelector('.subgraph-head-block');
    const infoNode = row.querySelector('.subgraph-info');
    const delayingNode = row.querySelector('.subgraph-delaying');
    const delayBlocksNode = row.querySelector('.subgraph-delay-blocks');
    const headBlockNode = row.querySelector('.subgraph-head-block');

    // Header
    nameNode.innerHTML = fullSubgraph.name;
    nameNode.href = `/subgraphs/name/${fullSubgraph.name}/graphql`;
    if (chainName) {
      chainNameNode.innerHTML = chainName;
      chainIconNode.innerHTML = '';
      chainIconNode.appendChild(chainIcon);
    }
    statusNode.innerHTML = status.replace('-', ' ');
    statusNode.classList.remove('pending', 'error');
    if (status === 'failed' || status === 'wait-deploy') {
      statusNode.classList.add('error');
    } else if (status === 'pending') {
      statusNode.classList.add('pending');
    }
    // Progress bar
    progressNode.style.width = `${progress}%`;
    progressNode.innerHTML = progress > 8 ? `${progress}%` : '';
    progressNode.classList.remove('error');
    if (status === 'failed') {
      progressNode.classList.add('error');
    }
    // Legend
    if (fullSubgraph.indexing && fullSubgraph.chain && fullSubgraph.indexing.start && fullSubgraph.indexing.current && (fullSubgraph.chain.headBlock || fullSubgraph.chain.realHeadBlock)) {
      legendNode.style.display = 'flex';
      legendStartNode.innerHTML = `${fullSubgraph.indexing.start}`;
      legendCurrentNode.innerHTML = `${fullSubgraph.indexing.current}`;
      legendHeadNode.innerHTML = `${fullSubgraph.chain.headBlock || fullSubgraph.chain.realHeadBlock}`;
    } else {
      legendNode.style.display = 'none';
    }
    // Block range Error
    if (fullSubgraph.chain && fullSubgraph.chain.headBlock && fullSubgraph.chain.realHeadBlock && fullSubgraph.chain.realHeadBlock - fullSubgraph.chain.headBlock > 5) {
      delayingNode.style.display = 'block';
      delayBlocksNode.innerHTML = `${fullSubgraph.chain.realHeadBlock - fullSubgraph.chain.headBlock}`;
      headBlockNode.innerHTML = `${fullSubgraph.chain.realHeadBlock}`;
    } else {
      delayingNode.style.display = 'none';
    }
    // Common info
    infoNode.innerHTML = `
      ${fullSubgraph.deployment ? `
      <div class="item">
        <div class="label">Deployment ID:</div>
        <div class="value">${fullSubgraph.deployment}</div>
      </div>
      ` : ''}
      <div class="item">
        <div class="label">Queries (HTTP):</div>
        <div class="value">${location.origin}/subgraphs/name/${fullSubgraph.name}</div>
      </div>
      <div class="item">
        <div class="label">Subscriptions (WS):</div>
        <div class="value">${location.origin}/ws/subgraphs/name/${fullSubgraph.name}</div>
      </div>
      <div class="item">
        <div class="label">Entities Count:</div>
        <div class="value">${fullSubgraph.entityCount || 0}</div>
      </div>
      <div class="item">
        <div class="label">Created At:</div>
        <div class="value">${dateFormat(new Date(fullSubgraph.createdAt * 1000))}</div>
      </div>
      <div class="item">
        <div class="label">Updated At:</div>
        <div class="value">${dateFormat(new Date(fullSubgraph.updatedAt * 1000))}</div>
      </div>`;
  });
}

(function () {
  function refreshSubgraphs() {
    Promise.all([fetchSubgraphs(), fetchHeadBlocks()])
      .then(([subgraphs, headBlocks]) => {
        if (!subgraphs.length) {
          return Promise.reject(new Error(`Not a any subgraph created yet`));
        }
        return fetchFullSubgraphs(subgraphs, headBlocks);
      })
      .then(fullSubgraphs => renderSubgraphs(fullSubgraphs))
      .then(() => setTimeout(refreshSubgraphs, 5000))
      .catch(error => {
        showError(error.message);
        setTimeout(refreshSubgraphs, 10000);
      });
  }

  refreshSubgraphs();
})();
