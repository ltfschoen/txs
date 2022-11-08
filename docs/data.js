const Data = {
  template: `
  <div>
    <b-button v-b-toggle.data-module size="sm" block variant="outline-info">Data</b-button>
    <b-collapse id="data-module" visible class="my-2">
      <b-card no-body class="border-0">
        <b-row>
          <b-col cols="4" class="small">Accounts</b-col>
          <b-col class="small truncate" cols="8">{{ Object.keys(accounts).length }}</b-col>
        </b-row>
        <b-row>
          <b-col cols="4" class="small">Transactions</b-col>
          <b-col class="small truncate" cols="8">{{ Object.keys(txs).length }}</b-col>
        </b-row>
        <b-row>
          <b-col cols="4" class="small">Assets</b-col>
          <b-col class="small truncate" cols="8">{{ Object.keys(assets).length }}</b-col>
        </b-row>
        <b-row>
          <b-col cols="4" class="small">ENS Map</b-col>
          <b-col class="small truncate" cols="8">{{ Object.keys(ensMap).length }}</b-col>
        </b-row>
      </b-card>
    </b-collapse>
  </div>
  `,
  data: function () {
    return {
      count: 0,
      reschedule: true,
    }
  },
  computed: {
    powerOn() {
      return store.getters['connection/powerOn'];
    },
    explorer () {
      return store.getters['connection/explorer'];
    },
    coinbase() {
      return store.getters['connection/coinbase'];
    },
    network() {
      return store.getters['connection/network'];
    },
    accounts() {
      return store.getters['data/accounts'];
    },
    txs() {
      return store.getters['data/txs'];
    },
    assets() {
      return store.getters['data/assets'];
    },
    ensMap() {
      return store.getters['data/ensMap'];
    },
  },
  methods: {
    async timeoutCallback() {
      logDebug("Data", "timeoutCallback() count: " + this.count);
      this.count++;
      var t = this;
      if (this.reschedule) {
        setTimeout(function() {
          t.timeoutCallback();
        }, 15000);
      }
    },
  },
  beforeDestroy() {
    logDebug("Data", "beforeDestroy()");
  },
  mounted() {
    logDebug("Data", "mounted() $route: " + JSON.stringify(this.$route.params));
    store.dispatch('config/restoreState');
    this.reschedule = true;
    logDebug("Data", "Calling timeoutCallback()");
    this.timeoutCallback();
  },
  destroyed() {
    this.reschedule = false;
  },
};

const dataModule = {
  namespaced: true,
  state: {
    accounts: {}, // TODO: Add chainId
    txs: {},
    assets: {}, // TODO: ChainId/Contract/TokenId/Number
    ensMap: {},
    sync: {
      section: null,
      total: null,
      completed: null,
      halt: false,
    },
    db: {
      name: "txs090d",
      version: 1,
      schemaDefinition: {
        cache: '&objectName',
      },
      updated: null,
    },
  },
  getters: {
    accounts: state => state.accounts,
    txs: state => state.txs,
    assets: state => state.assets,
    ensMap: state => state.ensMap,
    sync: state => state.sync,
  },
  mutations: {
    toggleAccountMine(state, key) {
      Vue.set(state.accounts[key], 'mine', !state.accounts[key].mine);
    },
    toggleAccountSync(state, key) {
      Vue.set(state.accounts[key], 'sync', !state.accounts[key].sync);
    },
    setAccountType(state, info) {
      Vue.set(state.accounts[info.key], 'type', info.accountType);
    },
    setGroup(state, info) {
      Vue.set(state.accounts[info.key], 'group', info.group);
    },
    setName(state, info) {
      Vue.set(state.accounts[info.key], 'name', info.name);
    },
    setNotes(state, info) {
      Vue.set(state.accounts[info.key], 'notes', info.notes);
    },
    addNewAccount(state, accountInfo) {
      // logInfo("dataModule", "mutations.addNewAccount(" + JSON.stringify(accountInfo) + ")");
      const block = store.getters['connection/block'];
      const network = store.getters['connection/network'];
      const chainId = network.chainId;
      if (!(chainId in state.accounts)) {
        Vue.set(state.accounts, chainId, {});
      }
      Vue.set(state.accounts[chainId], accountInfo.account, {
        group: null,
        name: null,
        type: accountInfo && accountInfo.type || null,
        mine: accountInfo.account == store.getters['connection/coinbase'],
        sync: accountInfo.account == store.getters['connection/coinbase'],
        tags: [],
        notes: null,
        contract: {
          name: accountInfo && accountInfo.name || null,
          symbol: accountInfo && accountInfo.symbol || null,
          decimals: accountInfo && accountInfo.decimals || null,
        },
        collection: accountInfo && accountInfo.collection || {},
        balances: accountInfo && accountInfo.balances || {},
        created: {
          timestamp: block && block.timestamp || null,
          blockNumber: block && block.number || null,
        },
        transactions: {},
        internalTransactions: {},
        events: {},
        updated: {
          timestamp: null,
          blockNumber: null,
        },
      });
    },
    addAccountERC20AndERC721Events(state, info) {
      const [chainId, account, events] = [info.chainId, info.account, info.events];
      const accountData = state.accounts[chainId][account];
      for (const event of events) {
        if (!event.removed) {
          if (!(event.transactionHash in accountData.events)) {
            accountData.events[event.transactionHash] = {};
          }
          const tempEvent = {...event, type: event.topics.length == 4 ? "erc721" : "erc20", processed: null };
          delete tempEvent.transactionHash;
          delete tempEvent.logIndex;
          delete tempEvent.removed;
          accountData.events[event.transactionHash][event.logIndex] = tempEvent;
        }
      }
    },
    addAccountERC1155Events(state, info) {
      const [chainId, account, events] = [info.chainId, info.account, info.events];
      const accountData = state.accounts[chainId][account];
      for (const event of events) {
        if (!event.removed) {
          if (!(event.transactionHash in accountData.events)) {
            accountData.events[event.transactionHash] = {};
          }
          const tempEvent = {...event, type: "erc1155", processed: null };
          delete tempEvent.transactionHash;
          delete tempEvent.logIndex;
          delete tempEvent.removed;
          accountData.events[event.transactionHash][event.logIndex] = tempEvent;
        }
      }
    },
    addAccountInternalTransactions(state, info) {
      const [chainId, account, results] = [info.chainId, info.account, info.results];
      const accountData = state.accounts[chainId][account];
      for (const result of results) {
        if (!(result.hash in accountData.internalTransactions)) {
          accountData.internalTransactions[result.hash] = {};
        }
        const tempResult = {...result, processed: null};
        delete tempResult.hash;
        delete tempResult.traceId;
        accountData.internalTransactions[result.hash][result.traceId] = tempResult;
      }
    },
    addAccountTransactions(state, info) {
      const [chainId, account, results] = [info.chainId, info.account, info.results];
      const accountData = state.accounts[chainId][account];
      for (const result of results) {
        if (!(result.hash in accountData.transactions)) {
          const tempResult = {...result, processed: null};
          delete tempResult.hash;
          accountData.transactions[result.hash] = tempResult;
        }
      }
    },
    updateAccountTimestampAndBlock(state, info) {
      const [chainId, account, events] = [info.chainId, info.account, info.events];
      Vue.set(state.accounts[chainId][account], 'updated', {
        timestamp: info.timestamp,
        blockNumber: info.blockNumber,
      });
    },
    addENSName(state, nameInfo) {
      Vue.set(state.ensMap, nameInfo.account, nameInfo.name);
    },
    addTxs(state, info) {
      const [chainId, txInfo] = [info.chainId, info.txInfo];
      logInfo("dataModule", "mutations.addTxs - info: " + JSON.stringify(info).substring(0, 100));
      if (!(chainId in state.txs)) {
        Vue.set(state.txs, chainId, {});
      }
      Vue.set(state.txs[chainId], txInfo.tx.hash, txInfo);
    },
    updateTxData(state, info) {
      logInfo("dataModule", "mutations.updateTxData - info: " + JSON.stringify(info).substring(0, 1000));
      Vue.set(state.txs[info.txHash].dataImported, 'tx', {
        hash: info.tx.hash,
        type: info.tx.type,
        blockHash: info.tx.blockHash,
        blockNumber: info.tx.blockNumber,
        transactionIndex: info.tx.transactionIndex,
        from: info.tx.from,
        gasPrice: info.tx.gasPrice,
        gasLimit: info.tx.gasLimit,
        to: info.tx.to,
        value: info.tx.value,
        nonce: info.tx.nonce,
        data: info.tx.data,
        r: info.tx.r,
        s: info.tx.s,
        v: info.tx.v,
        chainId: info.tx.chainId,
      });
      Vue.set(state.txs[info.txHash].dataImported, 'txReceipt', info.txReceipt);
      Vue.set(state.txs[info.txHash].computed.info, 'summary', info.summary);
    },
    setSyncSection(state, info) {
      state.sync.section = info.section;
      state.sync.total = info.total;
    },
    setSyncCompleted(state, completed) {
      state.sync.completed = completed;
    },
    setSyncHalt(state, halt) {
      state.sync.halt = halt;
    },
  },
  actions: {
    async restoreState(context) {
      const db0 = new Dexie(context.state.db.name);
      db0.version(context.state.db.version).stores(context.state.db.schemaDefinition);
      const ensMap = await db0.cache.where("objectName").equals('ensMap').toArray();
      if (ensMap.length == 1) {
        context.state.ensMap = ensMap[0].object;
      }
      const assets = await db0.cache.where("objectName").equals('assets').toArray();
      if (assets.length == 1) {
        context.state.assets = assets[0].object;
      }
      const txs = await db0.cache.where("objectName").equals('txs').toArray();
      if (txs.length == 1) {
        context.state.txs = txs[0].object;
      }
      const accounts = await db0.cache.where("objectName").equals('accounts').toArray();
      if (accounts.length == 1) {
        context.state.accounts = accounts[0].object;
      }
    },
    async saveData(context, types) {
      // logInfo("dataModule", "actions.saveData - types: " + JSON.stringify(types));
      const db0 = new Dexie(context.state.db.name);
      db0.version(context.state.db.version).stores(context.state.db.schemaDefinition);
      for (let type of types) {
        await db0.cache.put({ objectName: type, object: context.state[type] }).then (function() {
        }).catch(function(error) {
          console.log("error: " + error);
        });
      }
      db0.close();
    },
    async toggleAccountMine(context, key) {
      context.commit('toggleAccountMine', key);
      context.dispatch('saveData', ['accounts']);
    },
    async toggleAccountSync(context, key) {
      context.commit('toggleAccountSync', key);
      context.dispatch('saveData', ['accounts']);
    },
    async setAccountType(context, info) {
      context.commit('setAccountType', info);
      context.dispatch('saveData', ['accounts']);
    },
    async setGroup(context, info) {
      context.commit('setGroup', info);
      context.dispatch('saveData', ['accounts']);
    },
    async setName(context, info) {
      context.commit('setName', info);
      context.dispatch('saveData', ['accounts']);
    },
    async setNotes(context, info) {
      context.commit('setNotes', info);
      context.dispatch('saveData', ['accounts']);
    },
    async setSyncHalt(context, halt) {
      context.commit('setSyncHalt', halt);
    },
    async resetData(context, section) {
      console.log("data.actions.resetData - section: " + section);
      const db0 = new Dexie(context.state.db.name);
      db0.version(context.state.db.version).stores(context.state.db.schemaDefinition);
      const status = await db0.cache.where("objectName").equals(section).delete();
      console.log("status: " + JSON.stringify(status));
      db0.close();
    },
    async addNewAccounts(context, newAccounts) {
      // logInfo("dataModule", "actions.addNewAccounts(" + JSON.stringify(newAccounts) + ")");
      const accounts = newAccounts == null ? [] : newAccounts.split(/[, \t\n]+/).filter(name => (name.length == 42 && name.substring(0, 2) == '0x'));
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const ensReverseRecordsContract = new ethers.Contract(ENSREVERSERECORDSADDRESS, ENSREVERSERECORDSABI, provider);
      for (let account of accounts) {
        const accountInfo = await getAccountInfo(account, provider)
        if (accountInfo.account) {
          context.commit('addNewAccount', accountInfo);
        }
        const names = await ensReverseRecordsContract.getNames([account]);
        const name = names.length == 1 ? names[0] : account;
        if (!(account in context.state.ensMap)) {
          context.commit('addENSName', { account, name });
        }
      }
      context.dispatch('saveData', ['accounts', 'ensMap']);
    },
    async syncIt(context, info) {
      const sections = info.sections;
      const parameters = info.parameters || [];
      logInfo("dataModule", "actions.syncIt - sections: " + JSON.stringify(sections) + ", parameters: " + JSON.stringify(parameters).substring(0, 1000));
      const network = store.getters['connection/network'];
      const chainId = network.chainId;
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const ensReverseRecordsContract = new ethers.Contract(ENSREVERSERECORDSADDRESS, ENSREVERSERECORDSABI, provider);
      const etherscanAPIKey = store.getters['config/settings'].etherscanAPIKey && store.getters['config/settings'].etherscanAPIKey.length > 0 && store.getters['config/settings'].etherscanAPIKey || "YourApiKeyToken";
      const etherscanBatchSize = store.getters['config/settings'].etherscanBatchSize && parseInt(store.getters['config/settings'].etherscanBatchSize) || 5_000_000;
      const confirmations = store.getters['config/settings'].confirmations && parseInt(store.getters['config/settings'].confirmations) || 10;
      const block = await provider.getBlock();
      const confirmedBlockNumber = block && block.number && (block.number - confirmations) || null;
      const confirmedBlock = await provider.getBlock(confirmedBlockNumber);
      const confirmedTimestamp = confirmedBlock && confirmedBlock.timestamp || null;

      context.commit('setSyncHalt', false);
      for (let section of sections) {
        if (section == 'importFromEtherscan') {
          const accountsToSync = [];
          const chainData = context.state.accounts[chainId] || {};
          for (const [account, data] of Object.entries(chainData)) {
            console.log("account: " + account);
            if ((parameters.length == 0 && data.sync) || parameters.includes(account)) {
                accountsToSync.push(account);
            }
          }
          console.log("accountsToSync: " + JSON.stringify(accountsToSync));

          let sleepUntil = null;
          for (const accountIndex in accountsToSync) {
            context.commit('setSyncSection', { section: 'Import', total: accountsToSync.length });
            const account = accountsToSync[accountIndex];
            const item = context.state.accounts[chainId][account] || {};
            // const [chainId, account] = accountKey.split(':');
            context.commit('setSyncCompleted', parseInt(accountIndex) + 1);
            console.log("--- Syncing " + account + " --- ");
            console.log("item: " + JSON.stringify(item, null, 2).substring(0, 1000) + "...");
            const startBlock = item && item.updated && item.updated.blockNumber && (parseInt(item.updated.blockNumber) + 1) || 0;

            context.commit('setSyncSection', { section: 'Web3 Events', total: accountsToSync.length });
            for (let startBatch = startBlock; startBatch < confirmedBlockNumber; startBatch += etherscanBatchSize) {
              const endBatch = (parseInt(startBatch) + etherscanBatchSize < confirmedBlockNumber) ? (parseInt(startBatch) + etherscanBatchSize) : confirmedBlockNumber;
              const erc20AndERC721FilterFrom = {
                address: null,
                fromBlock: startBatch,
                toBlock: endBatch,
                topics: [
                  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer (index_topic_1 address from, index_topic_2 address to, index_topic_3 uint256 id)
                  '0x000000000000000000000000' + account.substring(2, 42).toLowerCase(),
                  null,
                ],
              };
              const erc20AndERC721EventsFrom = await provider.getLogs(erc20AndERC721FilterFrom);
              context.commit('addAccountERC20AndERC721Events', { chainId, account, events: erc20AndERC721EventsFrom });
              const erc20AndERC721FilterTo = {
                address: null,
                fromBlock: startBatch,
                toBlock: endBatch,
                topics: [
                  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer (index_topic_1 address from, index_topic_2 address to, index_topic_3 uint256 id)
                  null,
                  '0x000000000000000000000000' + account.substring(2, 42).toLowerCase(),
                ],
              };
              const erc20AndERC721EventsTo = await provider.getLogs(erc20AndERC721FilterTo);
              context.commit('addAccountERC20AndERC721Events', { chainId, account, events: erc20AndERC721EventsTo });
              const erc1155FilterFrom = {
                address: null,
                fromBlock: startBatch,
                toBlock: endBatch,
                topics: [
                  '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62', // ERC-1155 TransferSingle (index_topic_1 address _operator, index_topic_2 address _from, index_topic_3 address _to, uint256 _id, uint256 _value)
                  null,
                  '0x000000000000000000000000' + account.substring(2, 42).toLowerCase(),
                  null,
                ],
              };
              const erc1155EventsFrom = await provider.getLogs(erc1155FilterFrom);
              context.commit('addAccountERC1155Events', { chainId, account, events: erc1155EventsFrom });
              const erc1155FilterTo = {
                address: null,
                fromBlock: startBatch,
                toBlock: endBatch,
                topics: [
                  '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62', // ERC-1155 TransferSingle (index_topic_1 address _operator, index_topic_2 address _from, index_topic_3 address _to, uint256 _id, uint256 _value)
                  null,
                  null,
                  '0x000000000000000000000000' + account.substring(2, 42).toLowerCase(),
                ],
              };
              const erc1155EventsTo = await provider.getLogs(erc1155FilterTo);
              context.commit('addAccountERC1155Events', { chainId, account, events: erc1155EventsTo });
            }

            context.commit('setSyncSection', { section: 'Etherscan Internal Txs', total: accountsToSync.length });
            for (let startBatch = startBlock; startBatch < confirmedBlockNumber; startBatch += etherscanBatchSize) {
              const endBatch = (parseInt(startBatch) + etherscanBatchSize < confirmedBlockNumber) ? (parseInt(startBatch) + etherscanBatchSize) : confirmedBlockNumber;
              console.log("batch: " + startBatch + " to " + endBatch + ", sleepUntil: " + (sleepUntil ? moment.unix(sleepUntil).toString() : 'null'));
              do {
              } while (sleepUntil && sleepUntil > moment().unix());
              let importUrl = "https://api.etherscan.io/api?module=account&action=txlistinternal&address=" + account + "&startblock=" + startBatch + "&endblock=" + endBatch + "&page=1&offset=10000&sort=asc&apikey=" + etherscanAPIKey;
              console.log("importUrl: " + importUrl);
              const importData = await fetch(importUrl)
                .then(handleErrors)
                .then(response => response.json())
                .catch(function(error) {
                   console.log("ERROR - processIt: " + error);
                   // Want to work around API data unavailablity - state.sync.error = true;
                   return [];
                });
              if (importData.status == 1) {
                context.commit('addAccountInternalTransactions', { chainId, account, results: importData.result });
                if (importData.message && importData.message.includes("Missing")) {
                  sleepUntil = parseInt(moment().unix()) + 6;
                }
                if (context.state.sync.halt) {
                  break;
                }
              }
            }

            context.commit('setSyncSection', { section: 'Etherscan Transactions', total: accountsToSync.length });
            for (let startBatch = startBlock; startBatch < confirmedBlockNumber; startBatch += etherscanBatchSize) {
              const endBatch = (parseInt(startBatch) + etherscanBatchSize < confirmedBlockNumber) ? (parseInt(startBatch) + etherscanBatchSize) : confirmedBlockNumber;
              console.log("batch: " + startBatch + " to " + endBatch + ", sleepUntil: " + (sleepUntil ? moment.unix(sleepUntil).toString() : 'null'));
              do {
              } while (sleepUntil && sleepUntil > moment().unix());
              let importUrl = "https://api.etherscan.io/api?module=account&action=txlist&address=" + account + "&startblock=" + startBatch + "&endblock=" + endBatch + "&page=1&offset=10000&sort=asc&apikey=" + etherscanAPIKey;
              console.log("importUrl: " + importUrl);
              const importData = await fetch(importUrl)
                .then(handleErrors)
                .then(response => response.json())
                .catch(function(error) {
                   console.log("ERROR - processIt: " + error);
                   // Want to work around API data unavailablity - state.sync.error = true;
                   return [];
                });
              if (importData.status == 1) {
                context.commit('addAccountTransactions', { chainId, account, results: importData.result });
                if (importData.message && importData.message.includes("Missing")) {
                  sleepUntil = parseInt(moment().unix()) + 6;
                }
                if (context.state.sync.halt) {
                  break;
                }
              }
            }
            context.commit('updateAccountTimestampAndBlock', { chainId, account, timestamp: confirmedTimestamp, blockNumber: confirmedBlockNumber });
          }
          context.dispatch('saveData', ['accounts', 'txs', 'ensMap']);
          context.commit('setSyncSection', { section: null, total: null });

        } else if (section == 'downloadData') {
          const accountsToSync = [];
          const chainData = context.state.accounts[chainId] || {};
          for (const [account, data] of Object.entries(chainData)) {
            console.log("account: " + account);
            if ((parameters.length == 0 && data.sync) || parameters.includes(account)) {
                accountsToSync.push(account);
            }
          }
          console.log("accountsToSync: " + JSON.stringify(accountsToSync));

          let sleepUntil = null;
          for (const accountIndex in accountsToSync) {
            // context.commit('setSyncSection', { section: ' Import', total: accountKeysToSync.length });
            const account = accountsToSync[accountIndex];
            const item = context.state.accounts[chainId][account] || {};
            // context.commit('setSyncCompleted', parseInt(keyIndex) + 1);
            console.log("--- Downloading for " + account + " --- ");
            console.log("item: " + JSON.stringify(item, null, 2).substring(0, 1000) + "...");

            const txHashes = {};
            for (const [txHash, logIndexes] of Object.entries(item.events)) {
              if (!(txHash in context.state.txs) && !(txHash in txHashes)) {
                for (const [logIndex, event] of Object.entries(logIndexes)) {
                  if (!event.processed) {
                    txHashes[txHash] = event.blockNumber;
                  }
                }
              }
            }
            for (const [txHash, traceIds] of Object.entries(item.internalTransactions)) {
              if (!(txHash in context.state.txs) && !(txHash in txHashes)) {
                for (const [traceId, tx] of Object.entries(traceIds)) {
                  if (!tx.processed) {
                    txHashes[txHash] = tx.blockNumber;
                  }
                }
              }
            }
            for (const [txHash, tx] of Object.entries(item.transactions)) {
              if (!(txHash in context.state.txs) && !(txHash in txHashes)) {
                if (!tx.processed) {
                  txHashes[txHash] = tx.blockNumber;
                }
              }
            }
            // console.log("txHashes: " + JSON.stringify(txHashes));
            const txHashList = [];
            for (const [txHash, blockNumber] of Object.entries(txHashes)) {
              txHashList.push({ txHash, blockNumber });
            }
            txHashList.sort((a, b) => b.blockNumber - a.blockNumber);
            // console.log("txHashList: " + JSON.stringify(txHashList));
            context.commit('setSyncSection', { section: 'Download', total: txHashList.length });
            for (let txItemIndex in txHashList) {
              const txItem = txHashList[txItemIndex];
              context.commit('setSyncCompleted', parseInt(txItemIndex) + 1);
              console.log("Processing: " + JSON.stringify(txItem));
              const currentInfo = context.state.txs[chainId] && context.state.txs[chainId][txItem.txHash] || {};
              const info = await getTxInfo(txItem.txHash, currentInfo, provider);
              context.commit('addTxs', { chainId, txInfo: info});
              if (context.state.sync.halt) {
                break;
              }
            }
            // context.dispatch('saveData', ['accounts', 'txs', 'ensMap']);
            context.dispatch('saveData', ['txs']);
            if (context.state.sync.halt) {
              break;
            }
          }

        } else if (section == 'buildAssets') {
          const accountKeysToSync = [];
          for (const [key, item] of Object.entries(context.state.accounts)) {
            const [chainId, account] = key.split(':');
            if ((parameters.length == 0 && item.sync) || parameters.includes(account)) {
                accountKeysToSync.push(key);
            }
          }
          console.log("buildAssets - accountKeysToSync: " + JSON.stringify(accountKeysToSync));
          for (const keyIndex in accountKeysToSync) {
            context.commit('setSyncSection', { section: 'Build assets', total: null });
            const accountKey = accountKeysToSync[keyIndex];
            const item = context.state.accounts[accountKey];
            const [chainId, account] = accountKey.split(':');
            context.commit('setSyncCompleted', 1);
            console.log("--- Building assets for " + account + " --- ");
            console.log("item: " + JSON.stringify(item, null, 2).substring(0, 1000) + "...");

            let i = 0;
            let completed = 0;
            for (const [txHash, logIndexes] of Object.entries(item.events)) {
              if (txHash in context.state.txs) {
                const txItem = context.state.txs[txHash];
                for (const [logIndex, event] of Object.entries(logIndexes)) {
                  if (!event.processed) {
                    const contract = event.address;
                    const contractKey = chainId + ":" + contract;
                    if (!(contractKey in context.state.accounts)) {
                      let include = false;
                      if (event.topics[0] == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
                        const from = ethers.utils.getAddress("0x" + event.topics[1].substring(26));
                        const to = ethers.utils.getAddress("0x" + event.topics[2].substring(26));
                        let tokens = event.topics.length == 3 ? ethers.BigNumber.from(event.data) : ethers.BigNumber.from(event.topics[3]);
                        // if (i < 10) {
                        //   console.log(i + event.type + " contract: " + contract + ", from: " + from + ", to: " + to + ", tokens: " + tokens + " " + JSON.stringify(event));
                        // }
                        if ((from == account || to == account)) {
                          include = true;
                        }
                      // ERC-1155 TransferSingle (index_topic_1 address _operator, index_topic_2 address _from, index_topic_3 address _to, uint256 _id, uint256 _value)
                      } else if (event.topics[0] == "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62") {
                        const operator = ethers.utils.getAddress("0x" + event.topics[1].substring(26));
                        const from = ethers.utils.getAddress("0x" + event.topics[2].substring(26));
                        const to = ethers.utils.getAddress("0x" + event.topics[3].substring(26));
                        let tokens = ethers.BigNumber.from(event.data.substring(0, 66));
                        let value = ethers.BigNumber.from(event.data.substring(67, 130));
                        // console.log("ERC1155 " + i + event.type + " contract: " + contract + ", from: " + from + ", to: " + to + ", tokens: " + tokens + ", value: " + value + " " + JSON.stringify(event));
                        if ((from == account || to == account)) {
                          include = true;
                        }
                      } else {
                        console.log(i + event.type + " contract: " + contract + " " + txHash + " " + JSON.stringify(event));
                      }
                      if (include) {
                        context.commit('setSyncCompleted', parseInt(completed) + 1);
                        const accountInfo = await getAccountInfo(contract, provider)
                        if (accountInfo.account) {
                          context.commit('addNewAccount', accountInfo);
                          if (i < 10) {
                            console.log("Added contract account: " + contract + " " + accountInfo.type + " " + accountInfo.name);
                          }
                        }
                        completed++;
                      }
                    }
                  }
                  i++;
                }
              }
            }

            if (context.state.sync.halt) {
              break;
            }
          }
          context.dispatch('saveData', ['accounts']);
          context.commit('setSyncSection', { section: null, total: null });

        } else if (section == 'computeTxs') {
          console.log("computeTxs");
          context.commit('setSyncSection', { section: 'Compute', total: parameters.length });
          for (let txHashIndex in parameters) {
            const txHash = parameters[txHashIndex];
            const txItem = context.state.txs[txHash];
            if (txItem) {
              const info = await getTxInfo(txHash, txItem, provider);
              if (info.summary) {
                context.commit('updateTxData', info);
              }
            }
            context.commit('setSyncCompleted', parseInt(txHashIndex) + 1);
            if (context.state.sync.halt) {
              break;
            }
          }
        }
        context.dispatch('saveData', ['txs']);
        context.commit('setSyncSection', { section: null, total: null });
      }
    },
    // Called by Connection.execWeb3()
    async execWeb3({ state, commit, rootState }, { count, listenersInstalled }) {
      logInfo("dataModule", "execWeb3() start[" + count + ", " + listenersInstalled + ", " + JSON.stringify(rootState.route.params) + "]");
    },
  },
};
