# defaultPageTypes

Default registry mapping a manifest's `pages[].type` value to the Vue component [`CnPageRenderer`](../components/cn-page-renderer.md) mounts. The library ships built-in types here; consumers and downstream library extensions add their own by passing a merged map to [`CnAppRoot`](../components/cn-app-root.md) (or `CnPageRenderer`) via the `pageTypes` prop.

Each entry is wrapped in `defineAsyncComponent`, so apps using only a subset of types do **not** pay the bundle cost for the others (notably `dashboard`, which depends on GridStack).

The special `custom` type is **not** registered here — `CnPageRenderer` handles it inline, resolving `page.component` against the `customComponents` registry instead.

## Built-in types

| `type` | Component |
|--------|-----------|
| `index` | [`CnIndexPage`](../components/cn-index-page.md) |
| `detail` | [`CnDetailPage`](../components/cn-detail-page.md) |
| `dashboard` | [`CnDashboardPage`](../components/cn-dashboard-page.md) |

## Usage

### Library defaults only

When you don't pass `pageTypes`, `CnPageRenderer` falls back to `defaultPageTypes` automatically:

```vue
<CnAppRoot :manifest="manifest" app-id="decidesk" />
<!-- index / detail / dashboard pages dispatch correctly out of the box. -->
```

### Extending with an app-specific type

```js
import { defaultPageTypes } from '@conduction/nextcloud-vue'
import MyReportPage from './views/MyReportPage.vue'

const pageTypes = { ...defaultPageTypes, report: MyReportPage }
```

```vue
<CnAppRoot :manifest="manifest" app-id="myapp" :page-types="pageTypes" />
```

A page with `"type": "report"` in the manifest now renders `MyReportPage`.

### Adding a built-in type to the library

Add a new entry to `src/components/CnPageRenderer/pageTypes.js` and export the new component from `src/components/index.js`. No change to `CnPageRenderer.vue` itself.

## Related

- [CnPageRenderer](../components/cn-page-renderer.md) — The dispatcher that consults this registry.
- [CnAppRoot](../components/cn-app-root.md) — Provides the registry to descendant renderers via inject.
- [validateManifest](./validate-manifest.md) — Optional `allowedTypes` option enforces the registry at validation time.
