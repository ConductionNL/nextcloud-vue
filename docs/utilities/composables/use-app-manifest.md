# useAppManifest

Composable that loads, resolves, and validates a Conduction app manifest. Backs [`CnAppRoot`](../../components/cn-app-root.md) and the wider JSON manifest renderer pattern.

## Four-phase flow

1. **Synchronous bundled load** — `bundledManifest` is the immediate value of the returned `manifest` ref. The app shell can render straight away from the bundled copy.
2. **Async backend merge** — fetches `/index.php/apps/\{appId\}/api/manifest` and deep-merges any `200` response over the bundled manifest. `4xx` / `5xx` / network errors are silently ignored, so apps work without a backend endpoint. The composable uses `axios.get` from `@nextcloud/axios` by default (CSRF token attached automatically).
3. **Sentinel resolution** — `@resolve:<key>` strings under `pages[].config` are substituted with `IAppConfig` values via [`resolveManifestSentinels`](../resolve-manifest-sentinels.md). Unresolved keys (unset `IAppConfig` values) substitute `null` and surface on the returned `unresolvedSentinels` ref so consumers can render an admin warning.
4. **Validation** — the resolved result is validated by [`validateManifest`](../validate-manifest.md). On failure, the bundled manifest is kept and a `console.warn` is emitted with the error list; `validationErrors` is set so the consumer can surface the issue. The validator never observes an unresolved sentinel at runtime — the resolved value is what gets validated.

The returned `manifest` is reactive, so the future "app builder" backend can hot-swap the manifest without a page reload.

## Signature

Two call shapes are supported. The composable discriminates on `typeof arguments[0]` — a string enters the legacy fetch-and-merge branch; a non-null plain object enters the new in-memory branch. Both shapes return the same canonical four-property result.

```js
import { useAppManifest } from '@conduction/nextcloud-vue'

// Legacy positional signature — bundled manifest + backend fetch + sentinel resolution + validation.
const { manifest, isLoading, validationErrors } = useAppManifest(appId, bundledManifest, options)

// In-memory signature — mount an already-constructed manifest synchronously, no HTTP IO.
const { manifest, isLoading } = useAppManifest({ manifest: inMemoryManifest, validate: true })
```

| Argument | Type | Description |
|----------|------|-------------|
| `appId` | `string` | Nextcloud app ID. Used to build the default backend endpoint via `generateUrl` from `@nextcloud/router`, producing `/index.php/apps/\{appId\}/api/manifest`. |
| `bundledManifest` | `object` | Manifest shipped with the app — the synchronous default value. |
| `options.endpoint` | `string` | Override the backend fetch URL. Useful for tests and alternative-host deployments. |
| `options.fetcher` | `Function` | Override the fetch function. Must return a promise resolving to `{ status, data }`. Defaults to `axios.get`. |
| `options.getAppConfigValue` | `Function` | Override the `IAppConfig` resolver consumed by [`resolveManifestSentinels`](../resolve-manifest-sentinels.md). `(appId, key) => Promise<value\|null>`. Defaults to the `initial-state-then-fetch` chain documented in the resolver. |

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `manifest` | `Ref<object>` | The reactive manifest. Starts as `bundledManifest`; replaced by the resolved + deep-merged result on a successful 200 + valid response. |
| `isLoading` | `Ref<boolean>` | `true` while the async fetch is in flight. Pass to `CnAppRoot.isLoading` to drive the loading phase. |
| `validationErrors` | `Ref<string[] \| null>` | `null` until the merged manifest fails validation, then the array of validator errors. Stays `null` on network failures (which fall back silently). |
| `unresolvedSentinels` | `Ref<string[]>` | List of `@resolve:<key>` keys whose `IAppConfig` value resolved to `null` (unset / empty / fetch failure). Consumers MAY render an admin warning ("3 settings unconfigured") off this list. Empty array `[]` when every sentinel resolved cleanly. |

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

## Mounting an in-memory manifest

For consumers that build their manifest in memory from runtime state — for example the OpenBuilt app builder, which mounts virtual apps from store data and has no backend `/api/manifest` route — pass an options object whose `manifest` field is the canonical, fully-constructed manifest. The composable enters a separate, synchronous code path: no HTTP fetch, no deep-merge, no sentinel resolution.

```js
import { useAppManifest } from '@conduction/nextcloud-vue'

const builderManifest = buildManifestFromStore() // synchronously constructed
const { manifest, isLoading } = useAppManifest({ manifest: builderManifest })

// manifest.value === builderManifest (by reference; no clone)
// isLoading.value === false from the first read; no async tick required
```

### Optional pre-mount validation

Pass `validate: true` to run [`validateManifest`](../validate-manifest.md) synchronously before returning. Validation is **informational** — the manifest is mounted unchanged either way; a failure populates `validationErrors` and emits a `console.warn` prefixed with `[useAppManifest]`. This mirrors the legacy fetch-and-merge branch's policy and lets the consumer surface the error however it likes (banner, console only, ignore).

```js
const { manifest, validationErrors } = useAppManifest({
  manifest: builderManifest,
  validate: true,
})

if (validationErrors.value) {
  // manifest is still mounted; surface the errors to the builder UI
  // so the user can fix the offending field interactively.
  console.error('Manifest has issues:', validationErrors.value)
}
```

### When to use which signature

| Signature | Use when |
|-----------|----------|
| `useAppManifest(appId, bundled, options?)` | The app ships a static `manifest.json` and (optionally) a backend route at `/index.php/apps/{appId}/api/manifest` that returns a partial override. Default for all production Conduction apps. |
| `useAppManifest({ manifest })` | The host renders a virtual app whose manifest is constructed in memory at runtime (no static file, no backend route). Canonical consumer: the OpenBuilt app builder — see the `bootstrap-openbuilt` change for the full virtual-host pattern. |

### Guarantees of the in-memory branch

- `manifest.value` holds the input object **by reference**; Vue 2.7's reactivity adds reactive getters in place — do not pass objects whose property descriptors must remain untouched. Mutating the input object from elsewhere reflects in the ref immediately.
- `isLoading.value === false` synchronously. No async tick is required to settle.
- `validationErrors.value === null` unless `validate: true` and validation failed.
- `unresolvedSentinels.value === []` — sentinel resolution is a backend-merge concern and does not run on in-memory manifests. Build the manifest with its sentinels already resolved.
- No call to `axios.get`, `generateUrl`, or any `options.fetcher` is made. The branch is entirely synchronous from the caller's perspective.

## `@resolve:<key>` sentinel

Manifests MAY embed `@resolve:<key>` strings inside `pages[].config.*` to defer slug resolution to the consuming app's `IAppConfig`:

```json
{
  "pages": [
    {
      "id": "voorzieningen-index",
      "route": "/voorzieningen",
      "type": "index",
      "title": "app.voorzieningen",
      "config": { "register": "@resolve:voorzieningen_register", "schema": "voorziening" }
    }
  ]
}
```

When the loader runs, the sentinel is replaced with the result of `getAppConfigValue(appId, 'voorzieningen_register')`. The validator then sees the resolved string, never the sentinel.

- **Where it works:** any `string`-typed field at any depth under `pages[].config`. See [`resolveManifestSentinels`](../resolve-manifest-sentinels.md) for the full sentinel grammar and resolution source chain.
- **Where it doesn't:** `pages[].id`, `pages[].route`, `pages[].component`, `menu[].route`, `version`, `dependencies[]`, etc. The validator rejects sentinels in those paths because they are router invariants or registry keys.
- **Empty-state behaviour:** an unset `IAppConfig` key resolves to `null` (NOT empty string) and the key is added to `unresolvedSentinels`. A `console.warn` is emitted once per unresolved key.
- **Best practice:** consume `unresolvedSentinels` to render an admin warning when a tenant's manifest has unconfigured slugs. Downstream renderers (e.g. `CnIndexPage` with `config.register === null`) should short-circuit to a "not configured" empty state.

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
