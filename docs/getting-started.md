---
sidebar_position: 1
---

# Getting Started

`@conduction/nextcloud-vue` gives you a full schema-driven CRUD interface for your Nextcloud app in minutes — sortable tables, faceted filters, pagination, dialogs, settings pages, and a unified object store, all wired together from a single JSON schema.

![Full list page showing left navigation, data table with sortable columns, and right sidebar with search and filters](/img/screenshots/cn-index-page.png)

## Current Status & Scope

:::info OpenRegister-first development
This library is currently developed and tested primarily against **[OpenRegister](https://github.com/ConductionNL/openregister)** — an open-source Nextcloud app that provides a schema-driven object store with registers, schemas, and JSON-based objects.

**The goal is broader applicability.** The components are designed around standard JSON Schema and generic REST conventions, not OpenRegister internals. Future work will make the store layer configurable so apps can target any backend that follows the same schema/object model.

What this means today:
- The object store (`createObjectStore`) calls OpenRegister's API paths (`/apps/openregister/api/...`)
- Schema objects follow the OpenRegister schema format (title, description, properties, icon, required)
- Apps that use OpenRegister get the full feature set out of the box
- Apps targeting a different backend can still use all UI components directly — they just wire up their own data fetching
:::

## Prerequisites

- Nextcloud development environment (Docker recommended)
- Node.js 18+
- [OpenRegister](https://github.com/ConductionNL/openregister) app installed and enabled (for the full store integration)
- A Nextcloud app scaffold (see [Nextcloud App Development](https://docs.nextcloud.com/server/stable/developer_manual/app_development/index.html))

## Install the Library

```bash
npm install @conduction/nextcloud-vue
```

## Webpack Configuration

The library uses source aliasing for local development. Your `webpack.config.js` needs:

1. **Library alias** — resolve `@conduction/nextcloud-vue` to the source
2. **Deduplication aliases** — prevent dual-instance bugs (Vue, Pinia, @nextcloud/vue)
3. **VueLoaderPlugin replacement** — replace (not push) the plugin

```js
const { VueLoaderPlugin } = require('vue-loader')
const path = require('path')
const webpackConfig = require('@nextcloud/webpack-vue-config')

// 1. Library alias
webpackConfig.resolve.alias['@conduction/nextcloud-vue'] = path.resolve(
  __dirname, '../nextcloud-vue/src'
)

// 2. Deduplication — prevent dual Vue/Pinia/NcVue instances
webpackConfig.resolve.alias.vue = path.resolve(__dirname, 'node_modules/vue')
webpackConfig.resolve.alias.pinia = path.resolve(__dirname, 'node_modules/pinia')
webpackConfig.resolve.alias['@nextcloud/vue'] = path.resolve(
  __dirname, 'node_modules/@nextcloud/vue'
)

// 3. Replace VueLoaderPlugin (don't push — duplicates break templates)
webpackConfig.plugins = [new VueLoaderPlugin()]

module.exports = webpackConfig
```

:::warning Why deduplication matters
Without deduplication aliases, webpack resolves the library's own `node_modules/vue` and `node_modules/pinia` alongside your app's copies. This causes:
- **Dual Pinia** — `_s` errors because two Pinia instances don't share state
- **Dual Vue** — blank pages because reactivity breaks across instances
:::

Also ensure your `package.json` has `"sideEffects": true`:

```json
{
  "sideEffects": true
}
```

This prevents webpack from tree-shaking the library's CSS barrel imports.

## Register Icons

The library uses an extensible icon registry. Import `registerIcons` and register the MDI icons your schemas use:

```js
// main.js
import { registerIcons } from '@conduction/nextcloud-vue'
import '@conduction/nextcloud-vue/css/index.css'

import AccountGroupOutline from 'vue-material-design-icons/AccountGroupOutline.vue'
import FileDocumentOutline from 'vue-material-design-icons/FileDocumentOutline.vue'
import Cog from 'vue-material-design-icons/Cog.vue'

registerIcons({
  AccountGroupOutline,
  FileDocumentOutline,
  Cog,
})
```

Icons are resolved by PascalCase name. If a schema references `icon: "AccountGroupOutline"`, it renders the registered component. Unregistered icons fall back to `HelpCircleOutline`.

## Register Library Translations (required)

The library ships its own translation bundles (currently English + Dutch) and registers them under the `nextcloud-vue` namespace at runtime. Call `registerTranslations()` **once** during bootstrap in `main.js`, before mounting your root Vue instance:

```js
// main.js
import Vue from 'vue'
import { registerIcons, registerTranslations } from '@conduction/nextcloud-vue'
import '@conduction/nextcloud-vue/css/index.css'

registerIcons({ /* ...your icons */ })
registerTranslations()

new Vue({ /* ...router, pinia, etc. */ }).$mount('#content')
```

:::danger This is not optional
Without `registerTranslations()`, **every library-rendered string stays in English** — even when the user's Nextcloud language is Dutch. Labels like "Delete", "Cancel", "Items per page:", etc. will *not* pick up translations automatically, because Nextcloud's server-side l10n discovery only scans each app's own `l10n/` directory and cannot see an npm package's bundles.
:::

See [Internationalisation (i18n)](./integrations/i18n.md) for details on overriding individual strings via props, and how to contribute a new language to the library bundles.

## Create the Object Store

Use `createObjectStore` with plugins for your data needs:

```js
// store/modules/object.js
import { createObjectStore } from '@conduction/nextcloud-vue'
import {
  filesPlugin,
  auditTrailsPlugin,
  relationsPlugin,
  registerMappingPlugin,
} from '@conduction/nextcloud-vue'

export const useObjectStore = createObjectStore('myapp-objects', {
  plugins: [filesPlugin, auditTrailsPlugin, relationsPlugin, registerMappingPlugin],
})
```

## Create a Settings Store

Fetch your app's settings and register object types:

```js
// store/modules/settings.js
import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('myapp-settings', {
  state: () => ({
    settings: null,
    loading: false,
  }),
  actions: {
    async fetchSettings() {
      this.loading = true
      const response = await fetch('/apps/myapp/api/settings')
      this.settings = await response.json()
      this.loading = false
    },
  },
})
```

## Initialize Stores at Boot

```js
// store/store.js
import { useObjectStore } from './modules/object.js'
import { useSettingsStore } from './modules/settings.js'

export async function initializeStores() {
  const settingsStore = useSettingsStore()
  const objectStore = useObjectStore()

  await settingsStore.fetchSettings()

  // Register each entity type from settings (schemaId, registerId)
  for (const [type, config] of Object.entries(settingsStore.settings.objectTypes)) {
    objectStore.registerObjectType(type, config.schema, config.register)
  }
}
```

## Set Up Vue Router

```js
// router/index.js
import VueRouter from 'vue-router'
import Vue from 'vue'

Vue.use(VueRouter)

export default new VueRouter({
  mode: 'hash',
  routes: [
    { path: '/', name: 'Dashboard', component: () => import('../views/DashboardIndex.vue') },
    { path: '/contacts', name: 'ContactList', component: () => import('../views/ContactList.vue') },
    { path: '/contacts/:contactId', name: 'ContactDetail', component: () => import('../views/ContactDetail.vue'), props: true },
    // Add routes for each entity type...
  ],
})
```

## Build Your First List Page

```vue
<template>
  <CnIndexPage
    :title="schema?.title || 'Contacts'"
    :schema="schema"
    :objects="objectStore.getCollection('contact')"
    :pagination="objectStore.getPagination('contact')"
    :loading="objectStore.isLoading('contact')"
    @row-click="onRowClick"
    @create="onCreate"
    @delete="onDelete"
    @refresh="onRefresh"
    @page-changed="onPageChanged"
    @sort="onSort" />
</template>

<script>
import { CnIndexPage } from '@conduction/nextcloud-vue'
import { useObjectStore } from '../../store/modules/object.js'

export default {
  name: 'ContactList',
  components: { CnIndexPage },
  setup() {
    const objectStore = useObjectStore()
    return { objectStore }
  },
  computed: {
    schema() {
      return this.objectStore.getSchema('contact')
    },
  },
  mounted() {
    this.objectStore.fetchCollection('contact')
  },
  methods: {
    onRowClick(row) {
      this.$router.push({ name: 'ContactDetail', params: { contactId: row.id } })
    },
    onCreate(formData) {
      this.objectStore.saveObject('contact', formData)
    },
    onDelete(id) {
      this.objectStore.deleteObject('contact', id)
    },
    onRefresh() {
      this.objectStore.fetchCollection('contact')
    },
    onPageChanged(page) {
      this.objectStore.fetchCollection('contact', { _page: page })
    },
    onSort({ key, order }) {
      this.objectStore.fetchCollection('contact', { _sort: key, _order: order })
    },
  },
}
</script>
```

That's it — you have a working list page with sorting, pagination, faceted filtering, and CRUD dialogs, all driven by your OpenRegister schema.

## Next Steps

- [Layouts](./layouts/) — how the List, Detail, and Settings page layouts work
- [Component Reference](./components/) — browse all Cn* components
- [OpenRegister Integration](./integrations/openregister.md) — deep dive into the backend connection
- [Architecture Overview](./architecture/overview.md) — understand the three-layer design
