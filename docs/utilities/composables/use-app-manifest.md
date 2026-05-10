# useAppManifest

Composable that loads and validates a Conduction app manifest. Backs [`CnAppRoot`](../../components/cn-app-root.md) and the wider JSON manifest renderer pattern.

## Three-phase flow

1. **Synchronous bundled load** — `bundledManifest` is the immediate value of the returned `manifest` ref. The app shell can render straight away from the bundled copy.
2. **Async backend merge** — fetches `/index.php/apps/\{appId\}/api/manifest` and deep-merges any `200` response over the bundled manifest. `4xx` / `5xx` / network errors are silently ignored, so apps work without a backend endpoint. The composable uses `axios.get` from `@nextcloud/axios` by default (CSRF token attached automatically).
3. **Validation** — the merged result is validated by [`validateManifest`](../validate-manifest.md). On failure, the bundled manifest is kept and a `console.warn` is emitted with the error list; `validationErrors` is set so the consumer can surface the issue.

The returned `manifest` is reactive, so the future "app builder" backend can hot-swap the manifest without a page reload.

## Signature

```js
import { useAppManifest } from '@conduction/nextcloud-vue'

const { manifest, isLoading, validationErrors } = useAppManifest(appId, bundledManifest, options)
```

| Argument | Type | Description |
|----------|------|-------------|
| `appId` | `string` | Nextcloud app ID. Used to build the default backend endpoint via `generateUrl` from `@nextcloud/router`, producing `/index.php/apps/\{appId\}/api/manifest`. |
| `bundledManifest` | `object` | Manifest shipped with the app — the synchronous default value. |
| `options.endpoint` | `string` | Override the backend fetch URL. Useful for tests and alternative-host deployments. |
| `options.fetcher` | `Function` | Override the fetch function. Must return a promise resolving to `{ status, data }`. Defaults to `axios.get`. |

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `manifest` | `Ref<object>` | The reactive manifest. Starts as `bundledManifest`; replaced by the deep-merged result on a successful 200 + valid response. |
| `isLoading` | `Ref<boolean>` | `true` while the async fetch is in flight. Pass to `CnAppRoot.isLoading` to drive the loading phase. |
| `validationErrors` | `Ref<string[] \| null>` | `null` until the merged manifest fails validation, then the array of validator errors. Stays `null` on network failures (which fall back silently). |

## Usage

### Composition API

```js
import { useAppManifest } from '@conduction/nextcloud-vue'
import bundledManifest from './manifest.json'

const { manifest, isLoading } = useAppManifest('decidesk', bundledManifest)
```

### Options API (via `setup`)

```js
export default {
  setup() {
    return useAppManifest('decidesk', bundledManifest)
  },
}
```

### Tests / alternative endpoints

```js
useAppManifest('decidesk', bundledManifest, {
  endpoint: '/custom/manifest/url',
  fetcher: (url) => Promise.resolve({ status: 200, data: { /* ... */ } }),
})
```

## Deep-merge semantics

- Plain objects are merged recursively (own keys from `source` take precedence).
- Arrays are **replaced**, not concatenated — the typical override semantic for manifest fields like `menu` and `pages`.
- Non-object `source` values short-circuit and replace the target.

## Dynamic per-tenant menu entries

The `menu[]` array is replaced wholesale by any 200 response from the backend `/api/manifest` endpoint. This is the canonical pattern for **per-tenant menu fan-out** — apps whose top-level navigation depends on runtime data (catalogues, organisations, registers).

The bundled manifest declares a static placeholder; the backend resolves the per-tenant data and returns a fully-populated `menu[]`; `useAppManifest`'s deep-merge replaces the bundled list with the resolved one.

### Bundled (`src/manifest.json`)

```json
{
  "version": "1.0.0",
  "menu": [
    { "id": "catalogs", "label": "menu.catalogs", "route": "catalogs-index" }
  ],
  "pages": [
    { "id": "catalogs-index", "route": "/catalogs", "type": "index", "title": "app.catalogs", "config": { "register": "@resolve:listing_register", "schema": "@resolve:listing_schema" } },
    { "id": "catalog-detail", "route": "/catalogs/:slug", "type": "detail", "title": "app.catalog", "config": { "register": "@resolve:listing_register", "schema": "@resolve:listing_schema" } }
  ]
}
```

### Backend `/index.php/apps/\{appId\}/api/manifest`

```json
{
  "menu": [
    {
      "id": "catalogs",
      "label": "menu.catalogs",
      "route": "catalogs-index",
      "children": [
        { "id": "catalog-tax",     "label": "menu.catalog.tax",     "route": "catalog-detail", "icon": "icon-folder" },
        { "id": "catalog-housing", "label": "menu.catalog.housing", "route": "catalog-detail", "icon": "icon-folder" },
        { "id": "catalog-permits", "label": "menu.catalog.permits", "route": "catalog-detail", "icon": "icon-folder" }
      ]
    }
  ]
}
```

After the loader resolves, `manifest.menu[0].children` carries the three resolved catalogue entries. [`CnAppNav`](../../components/cn-app-nav.md) renders them as nested entries under the parent `catalogs` group.

### Contract

- Backend-supplied `menu[]` items MUST validate against the same `menuItem` / `menuItemLeaf` `$defs` the bundled manifest uses. Same fields, same constraints, same one-level nesting limit.
- `label` MUST be a translation key resolved by the consuming app's `t()` function. The backend MUST NOT ship localised free-text labels (per ADR-025 i18n source-of-truth).
- The backend ships partial manifests — omit `pages[]` if you only want to override `menu[]`. The bundled `pages[]` survives the merge.
- The bundled manifest SHOULD include placeholder menu entries so the bundled-only path validates and renders something coherent before the backend response arrives.
- A 404 from the backend is the documented "no override" response — the bundled manifest survives unchanged.

### What lives where

| Concern | Owner |
|---|---|
| Decide which menu entries are per-tenant dynamic | Backend (per-app concern) |
| Resolve register / schema slugs into actual catalogues | Backend (via OpenRegister or whatever data source) |
| Render the merged menu | `CnAppNav` (consumes the resolved `manifest.menu`) |
| Validate the merged manifest | `useAppManifest` → `validateManifest` |

The lib never directly queries a register or schema. ADR-022 (apps consume OR abstractions) keeps the data layer behind the app's backend; the manifest is the FE expression of the same boundary.

### What is NOT supported

A `dynamicSource: \{ register, schema, labelField, routeTemplate \}` field on `menu[]` items — the rejected "Option B" design — is **not** part of the schema. The runtime FE validator is intentionally narrow and does not enforce `additionalProperties: false`, so a misconfigured backend response carrying such a field passes through silently at runtime. The build-time `npm run check:manifest` step (using Ajv against the canonical schema) is the canonical gate that rejects unknown fields. See `openspec/changes/manifest-dynamic-menu/design.md` for the trade-off analysis.

## Notes

- Validation failures **do not** swap the manifest; the bundled value stays in place and a warning is logged. Apps that want to surface validation errors to users should watch `validationErrors`.
- The async merge happens once on call; the composable does not subscribe to a stream. Hot-swap is achieved by mutating `manifest.value` from elsewhere.

## Related

- [CnAppRoot](../../components/cn-app-root.md) — Primary consumer (drives the loading phase via `isLoading`).
- [validateManifest](../validate-manifest.md) — The validator used internally.
- [useAppStatus](./use-app-status.md) — Companion composable for dependency detection.
