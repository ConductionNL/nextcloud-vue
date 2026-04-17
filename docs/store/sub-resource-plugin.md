---
sidebar_position: 4
---

# createSubResourcePlugin

Factory that generates an object-store plugin for a standard OpenRegister sub-resource — a paginated collection hanging off an object URL (e.g. `/{register}/{schema}/{id}/audit-trails`). Every sub-resource plugin shipped with this library (`auditTrailsPlugin`, `relationsPlugin`, `filesPlugin`, `lifecyclePlugin`, `searchPlugin`, …) is built on top of this factory.

Use `createSubResourcePlugin` directly when your app needs shared store state for a new sub-resource that doesn't already have a dedicated plugin. For per-component state without a store, reach for the [`useSubResource`](../utilities/composables/use-sub-resource.md) composable instead.

## Signature

```js
import { createSubResourcePlugin } from '@conduction/nextcloud-vue'

// Simple read-only sub-resource
export const contractsPlugin = createSubResourcePlugin('contracts', 'contracts')

// With a custom page size
export const notesPlugin = createSubResourcePlugin('notes', 'notes', { limit: 50 })
```

### Parameters

| Arg | Type | Description |
|-----|------|-------------|
| `name` | `string` | camelCase identifier used to derive state keys and action names (e.g. `'auditTrails'`). |
| `endpoint` | `string` | URL path segment appended to the object URL (e.g. `'audit-trails'`). |
| `options.limit` | `number` | Default `_limit`. Default `20`. |

The factory returns a **plugin factory** — a function of no arguments returning the plugin definition. That indirection is what the object-store plugin registry expects; register it by calling it once:

```js
import { createObjectStore } from '@conduction/nextcloud-vue'

const useStore = createObjectStore('object', {
  plugins: [contractsPlugin(), notesPlugin()],
})
```

## Generated surface

For `name = 'auditTrails'`, the factory produces (with `cap = 'AuditTrails'`):

### State

| Key | Type | Initial value |
|-----|------|---------------|
| `auditTrails` | object | `emptyPaginated(limit)` |
| `auditTrailsLoading` | boolean | `false` |
| `auditTrailsError` | object \| null | `null` |

### Getters

| Getter | Returns |
|--------|---------|
| `getAuditTrails` | `state.auditTrails` |
| `isAuditTrailsLoading` | `state.auditTrailsLoading` |
| `getAuditTrailsError` | `state.auditTrailsError` |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `fetchAuditTrails` | `(type, objectId, params?)` | GET `{baseUrl}/{register}/{schema}/{objectId}/audit-trails` with `buildQueryString(params)`. On success, populates `auditTrails` with `{ results, total, page, pages, limit, offset }`. On HTTP failure, sets `auditTrailsError` via [`parseResponseError`](../utilities/parse-response-error.md) and returns `[]`. On network failure (`TypeError` from `fetch`), sets the error via [`networkError`](../utilities/network-error.md). |
| `clearAuditTrails` | `()` | Reset state to `emptyPaginated(limit)` + clear loading/error. |

The URL is built via `this._buildUrl(type, objectId)`, which the core object store supplies.

## `emptyPaginated(limit?)`

Exported helper that returns the standard empty-paginated shape used by every sub-resource plugin:

```js
import { emptyPaginated } from '@conduction/nextcloud-vue'

emptyPaginated()     // { results: [], total: 0, page: 1, pages: 0, limit: 20, offset: 0 }
emptyPaginated(50)   // same shape with limit: 50
```

Use it when initializing a custom state slice outside the factory (e.g. if you're hand-writing a plugin and want the same defaults).

## Related

- [Store plugins](./plugins.md) — Index of pre-built plugins that use this factory.
- [useSubResource](../utilities/composables/use-sub-resource.md) — Per-component alternative when shared store state isn't needed.
