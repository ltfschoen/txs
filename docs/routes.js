const routes = [{
    path: '/config',
    component: Config,
    name: 'Config',
  }, {
    path: '/mappings',
    component: Mappings,
    name: 'Mappings',
  }, {
    path: '/account',
    component: Account,
    name: 'Account',
  }, {
    path: '/accounts',
    component: Accounts,
    name: 'Accounts',
  }, {
    path: '/assets',
    component: Assets,
    name: 'Assets',
  }, {
    path: '/report/:contractOrTxOrBlockRange?',
    component: Report,
    name: 'Report',
    props: true,
  }, {
    path: '/transactions',
    component: Transactions,
    name: 'Transactions',
  }, {
    path: '/data',
    component: Data,
    name: 'Data',
  // }, {
  //   path: '/docs/:section/:topic',
  //   component: Docs,
  //   name: 'Docs',
  }, {
    // https://router.vuejs.org/guide/migration/#removed-star-or-catch-all-routes
    path: '/:pathMatch(.*)*',
    component: Welcome,
    name: 'welcome'
  }
];
