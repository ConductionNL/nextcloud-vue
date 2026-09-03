---
title: Migrating from 0.1.x to 1.0.x
sidebar_position: 9
---

# Migrating from 0.1.x to 1.0.x

This guide is for apps currently using `@conduction/nextcloud-vue@^0.1.0-beta.x` (Integriq, Filinq, Planninq, and similar apps). The upgrade to `1.0.0` requires **two changes** in `main.js` and `package.json`. Existing component templates and store calls need no modification.

---

## Quick checklist

```
[ ] 1. Bump version in package.json
[ ] 2. Add registerTranslations() in main.js
[ ] 3. Run npm install
[ ] 4. Test — no template changes needed
```

---

## Step 1 — Bump the version

In `package.json`, change the dependency:

```diff
- "@conduction/nextcloud-vue": "^0.1.0-beta.11"
+ "@conduction/nextcloud-vue": "^1.0.0-beta"
```

Then install:

```bash
npm install
```

---

## Step 2 — Add `registerTranslations()` to `main.js`

This is the only **required code change**. Without it the library renders all its built-in strings (button labels, dialog titles, empty-state messages) in English regardless of the user's Nextcloud language.

```diff
  import { registerIcons } from '@conduction/nextcloud-vue'
+ import { registerTranslations } from '@conduction/nextcloud-vue'
  import '@conduction/nextcloud-vue/css/index.css'

  registerIcons({ /* your icons */ })
+ registerTranslations()

  new Vue({ /* router, pinia, etc. */ }).$mount('#content')
```

`registerTranslations()` must be called **before** `new Vue().$mount()`. It is safe to call multiple times (idempotent).

---

## Step 3 — Verify your store factories still work

No changes are needed. The `createCrudStore`, `logsPlugin`, and `createObjectStore` call signatures are unchanged. Your existing store modules will continue to work as written:

```js
// This still works exactly as before
export const useSourceStore = createCrudStore('source', {
  endpoint: 'sources',
  baseUrl: '/index.php/apps/openconnector/api',
  entity: Source,
  features: { loading: true, viewMode: true },
  plugins: [
    logsPlugin({ parentIdParam: 'source_id', autoRefreshOnItemChange: true }),
  ],
})
```

---

## What did NOT change

- All props on `CnIndexPage`, `CnFormDialog`, `CnDeleteDialog`, `CnDashboardPage`, `CnStatsBlock`, `CnVersionInfoCard`, `CnChartWidget` — all existing props still work with the same names, types, and defaults.
- All events (`@create`, `@edit`, `@delete`, `@sort`, `@page-changed`, etc.) — unchanged.
- All slots — unchanged.
- `createCrudStore` config shape — unchanged.
- `logsPlugin` option names — unchanged.
- `registerIcons` call — unchanged.
- CSS import path `@conduction/nextcloud-vue/css/index.css` — unchanged.

---

## What is new (optional to adopt)

You do not need to adopt any of these to upgrade. They are available when you are ready.

| Feature | What it gives you |
|---------|-------------------|
| `CnAppRoot` + `manifest.json` | Full manifest-driven app shell — routes, nav, dependencies in one JSON file |
| `liveUpdatesPlugin` | Real-time collection updates via `@nextcloud/notify_push` |
| `registerMappingPlugin` | Register-to-register mapping configuration UI |
| `CnObjectDataWidget` | Click-to-edit schema-driven data grid for detail pages |
| `CnAdvancedFormDialog` | Richer form dialog with Properties table and raw JSON tab |
| `safeHref` / `safeImageSrc` | Security utilities for `:href` and `src` bindings |
| Integration registry | Pluggable sidebar tabs and dashboard widgets |

See the [CHANGELOG](https://github.com/ConductionNL/nextcloud-vue/blob/main/CHANGELOG.md) for the full list.

---

## Troubleshooting

**Library strings appear in English after upgrade**
→ `registerTranslations()` was not called, or was called after `new Vue().$mount()`. Move it before the mount call.

**Dual Pinia / `_s` store errors**
→ Add deduplication aliases to `webpack.config.js`:
```js
webpackConfig.resolve.alias.pinia = path.resolve(__dirname, 'node_modules/pinia')
webpackConfig.resolve.alias.vue = path.resolve(__dirname, 'node_modules/vue')
webpackConfig.resolve.alias['@nextcloud/vue'] = path.resolve(__dirname, 'node_modules/@nextcloud/vue')
```
See [Getting Started](./getting-started.md#webpack-configuration) for the full config.

**`createCrudStore` returns a function wrapper instead of a store**
→ This is expected when plugins have setup hooks (e.g. `logsPlugin`). Call `useSourceStore()` normally — the behaviour is identical. Do not use the store factory itself as a value (i.e. avoid `store === useSourceStore` identity checks).

**`npm install` fails with peer dependency errors**
→ Make sure you are not using `--legacy-peer-deps`. If you see a conflict, check that your `devDependencies` match the aligned versions: `eslint ^8.56.0`, `eslint-plugin-jsdoc ^46.2.6`, `typescript ^5.x`. See [package.json](../package.json) for the full aligned set.
