# mountCnApp

Boot a manifest app on [`CnAppRoot`](../components/cn-app-root.md) in one call. `mountCnApp` builds the router from the manifest's pages, registers the app's icons and the library's translations, and mounts `CnAppRoot` with the manifest and the registry. The `main.js` of a manifest app then holds only what is its own: which manifest, which registry, which icons.

```js
import { buildManifest, mountCnApp, registerBuiltinDashboardWidgets } from '@conduction/nextcloud-vue'
import { createRouter, createWebHistory } from 'vue-router'
import manifest from './manifest.json'
import registry from './registry.js'
import icons from './icons.js'
import pinia from './pinia.js'
import '@conduction/nextcloud-vue/css/index.css'

registerBuiltinDashboardWidgets()
mountCnApp('#content', {
	appId: 'larpinq',
	manifest,
	registry,
	icons,
	plugins: [pinia],
	vueRouter: { createRouter, createWebHistory },
})
```

The library does not depend on vue-router, so the host hands over `createRouter` and `createWebHistory`, or a `router` it built itself.

## Options

`target` is where the app mounts: a selector such as `#content`, or an element.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appId` | String | (required) | The app id; also the router base. |
| `manifest` | Object | (required) | The effective manifest (after `buildManifest`). |
| `registry` | Object | `{}` | The kind-tagged registry (ADR-036), handed to `CnAppRoot`. |
| `pageTypes` | Object | `defaultPageTypes` | Page type components. |
| `icons` | Object | `null` | MDI icons the manifest names, passed to `registerIcons`. |
| `router` | Object | `null` | A ready router. Without it one is built with `vueRouter`. |
| `vueRouter` | `{ createRouter, createWebHistory }` | `null` | vue-router's factories, used when no `router` is given. |
| `plugins` | Array | `[]` | Plugins to install before mounting (pinia, ...). |
| `rootComponent` | Object | `CnAppRoot` | A host `App.vue` that wraps `CnAppRoot`, when the app needs slots. |
| `rootProps` | Object | `{}` | More props for the root: `customComponents`, `translate`, `permissions`, ... |

It returns `{ app, router }`.

## The router

`routesFromManifest(manifest, { component?, fallback? })` gives one route per page, named by the page `id`, at its `route`, rendered by `CnPageRenderer` (with `props` on a route with parameters), and a catch-all that redirects to `fallback` (default `/`). `appRouterBase(appId)` is the base for this page load: Nextcloud serves an app under both `/apps/<id>` and `/index.php/apps/<id>`, and the base keeps the form the reader arrived on, so a deep link on the other form is not redirected to the start page.
