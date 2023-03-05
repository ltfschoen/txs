#!/bin/bash

# Update dependencies and source maps

# JS
wget -NP ./docs/js https://cdnjs.cloudflare.com/ajax/libs/bignumber.js/4.0.0/bignumber.js.map
wget -NP ./docs/js https://cdnjs.cloudflare.com/ajax/libs/bootstrap-vue/2.23.1/bootstrap-vue.js.map
wget -NP ./docs/js https://cdnjs.cloudflare.com/ajax/libs/bootstrap-vue/2.23.1/bootstrap-vue.min.js
wget -NP ./docs/js https://cdnjs.cloudflare.com/ajax/libs/bootstrap-vue/2.23.1/bootstrap-vue.min.js.map
wget -NP ./docs/js https://cdnjs.cloudflare.com/ajax/libs/bootstrap-vue/2.23.1/bootstrap-vue-icons.min.js
wget -NP ./docs/js https://cdnjs.cloudflare.com/ajax/libs/bootstrap-vue/2.23.1/bootstrap-vue-icons.min.js.map
wget -NP ./docs/js https://cdnjs.cloudflare.com/ajax/libs/dexie/3.0.3/dexie.js.map
# https://github.com/vuejs/router
wget -NP ./docs/js https://unpkg.com/vue-router@4.1.6/dist/vue-router.global.js
wget -NP ./docs/js https://cdnjs.cloudflare.com/ajax/libs/vuex/4.1.0/vuex.global.js
wget -NP ./docs/js https://cdn.jsdelivr.net/npm/vuex-router-sync@6.0.0-rc.1/dist/vuex-router-sync.global.js

# CSS
wget -NP ./docs/css https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.5.0/css/bootstrap.min.css
wget -NP ./docs/css https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.5.0/css/bootstrap.min.css.map
wget -NP ./docs/css https://cdnjs.cloudflare.com/ajax/libs/bootstrap-vue/2.23.1/bootstrap-vue.min.css
wget -NP ./docs/css https://cdnjs.cloudflare.com/ajax/libs/bootstrap-vue/2.23.1/bootstrap-vue.min.css.map
wget -NP ./docs/css https://cdnjs.cloudflare.com/ajax/libs/bootstrap-vue/2.23.1/bootstrap-vue-icons.min.css
wget -NP ./docs/css https://cdnjs.cloudflare.com/ajax/libs/bootstrap-vue/2.23.1/bootstrap-vue-icons.min.css.map

SCRIPTS_DIR=$(realpath "$(dirname "${BASH_SOURCE[0]}")")
PROJECT_ROOT=$(dirname "$SCRIPTS_DIR")
source ~/.bash_profile
mkdir -p temp/vuejs && cd temp/vuejs
git clone https://github.com/vuejs/core
cd core
nvm use v19.6.0
npm install -g pnpm --force
pnpm install
pnpm run build
# TODO - create source maps for latest versions
cp packages/vue-compat/dist/vue.global.js $PROJECT_ROOT/docs/js/vue-compat.global.js
cp packages/vue/dist/vue.global.js $PROJECT_ROOT/docs/js/vue.global.js
cd $PROJECT_ROOT


