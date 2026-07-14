---
sidebar_position: 1
---

# Object Store

The core store system for managing OpenRegister objects via Pinia. The store is **multi-type**: you register object types by slug, then all state and operations are keyed by that type.

## createObjectStore

Factory function that creates a Pinia store with CRUD operations and plugin support.

```js
import { createObjectStore } from '@conduction/nextcloud-vue'

export const useObjectStore = createObjectStore(storeId, options)
```

### Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `storeId` | String | Unique Pinia store identifier (e.g., `'myapp-objects'`) | - |
| `options.plugins` | Array | Array of plugin functions to extend the store | `[]` |
| `options.baseUrl` | String | Base API URL override | `'/apps/openregister/api/objects'` |
| `options.state` | Function | Extra state factory — merged after plugin state | `undefined` |
| `options.getters` | Object | Extra getters — merged after plugin getters | `undefined` |
| `options.actions` | Object | Extra actions — merged after plugin actions | `undefined` |
| `options.liveUpdates` | Boolean \| Object | Live-updates control. The [`liveUpdatesPlugin`](./plugins/live-updates.md) is installed **by default**. Pass `false` to opt out, or an options object (e.g. `{ pollIntervalCollection: 15000 }`) to configure the default install. See [Live updates](#live-updates-default-on) below. | `true` |
| `options.organisationUuidGetter` | Function | `() => string\|null` — when set, every request stamps `X-OpenRegister-Organisation: <uuid>` (multi-tenancy). | `null` |
| `options.languageGetter` | Function | `() => string\|null` — when set, every read URL stamps `?_lang=<bcp47>` so OR returns the localised projection (`i18n-api-language-negotiation`). | `null` |
| `options.targetLanguageGetter` | Function | `() => string\|null` — when set, every write request stamps `X-Translation-Target-Language: <bcp47>` so OR authors the payload into `_translations[<bcp47>]` instead of overwriting the source row (`i18n-source-of-truth`). | `null` |

The three getters above are tolerant: a `null` / empty / throwing
return is downgraded to "no stamp" — a buggy getter NEVER breaks an
outbound request. See
[`docs/composables/use-object-store.md`](../composables/use-object-store.md)
for the language-negotiation deep-dive and
[`docs/composables/use-tenant-context.md`](../composables/use-tenant-context.md)
for the tenancy deep-dive.

### Return Value

Returns a `useObjectStore()` composable (Pinia `defineStore` result) with the following.

#### Object Type Registration

| Method | Signature | Description |
|--------|-----------|-------------|
| `registerObjectType` | `(slug, schemaId, registerId)` | Register an entity type with its OpenRegister schema and register IDs |
| `unregisterObjectType` | `(slug)` | Unregister a type and clear all its state |

#### CRUD Operations

| Method | Signature | Description |
|--------|-----------|-------------|
| `fetchCollection` | `(type, params?)` | Fetch paginated list for a type; results stored in state |
| `fetchObject` | `(type, id)` | Fetch single object by type and ID; cached in state |
| `saveObject` | `(type, objectData)` | Create (no `id`) or update (with `id`) an object |
| `deleteObject` | `(type, id)` | Delete object by type and ID |
| `deleteObjects` | `(type, ids)` | Delete multiple objects in parallel; returns `{ successfulIds, failedIds }` for partial success/failure |

Search is done by passing `_search` (and optionally filters) in `params` to `fetchCollection`. Use `setSearchTerm(type, term)` and `getSearchTerm(type)` for UI state.

#### State and Getters

State is stored **per type**. Use getters to read it; do not rely on raw state shape.

| Getter | Signature | Description |
|--------|-----------|-------------|
| `getCollection` | `(type)` | Current list of objects for that type (array) |
| `getObject` | `(type, id)` | Cached single object, or null |
| `getPagination` | `(type)` | `{ total, page, pages, limit }` for that type |
| `isLoading` | `(type)` | Whether that type is currently loading |
| `getError` | `(type)` | Last error for that type (ApiError or null) |
| `getSearchTerm` | `(type)` | Current search term for that type |
| `getSchema` | `(type)` | Cached schema for that type (from `fetchSchema`) |
| `getFacets` | `(type)` | Facet data for that type (from collection fetch) |
| `objectTypes` | — | Array of registered type slugs |

Internal state (for reference): `objectTypeRegistry`, `collections`, `objects`, `loading`, `errors`, `pagination`, `searchTerms`, `schemas`, `facets`.

### Usage

```js
import { createObjectStore } from '@conduction/nextcloud-vue'
import { filesPlugin, auditTrailsPlugin, relationsPlugin } from '@conduction/nextcloud-vue'

export const useObjectStore = createObjectStore('myapp-objects', {
  plugins: [filesPlugin, auditTrailsPlugin, relationsPlugin],
})

// In a component
const store = useObjectStore()
store.registerObjectType('contact', 'schema-id', 'register-id')
await store.fetchCollection('contact', { _page: 1, _limit: 20 })

// Read list and pagination via getters
const list = store.getCollection('contact')
const pagination = store.getPagination('contact')
```

### Live updates (default-on)

Every store created via `createObjectStore` ships with the
[`liveUpdatesPlugin`](./plugins/live-updates.md) installed, so
`store.subscribe(type, id?)` / `store.unsubscribe(handle)` and the
`liveStatus` / `liveSubscriptions` / `liveLastEventAt` state are available
out of the box.

**The default install is fully inert until the first `subscribe()` call**: no
`@nextcloud/notify_push` probe, no websocket connection, no polling timers,
and no request-dedup wrapping happen before that. Apps that never call
`subscribe()` see zero behaviour change.

```js
// Default: live updates available, nothing active until subscribe()
const useMyStore = createObjectStore('myapp-objects')

// Opt out entirely — no subscribe/unsubscribe actions, no live state
const useStaticStore = createObjectStore('myapp-static', { liveUpdates: false })

// Configure the default install
const useFastStore = createObjectStore('myapp-fast', {
  liveUpdates: { pollIntervalCollection: 15000 },
})

// Explicitly passing the plugin still works and is NOT double-installed —
// the explicit instance (and its options) wins.
import { liveUpdatesPlugin } from '@conduction/nextcloud-vue'
const useExplicitStore = createObjectStore('myapp-explicit', {
  plugins: [liveUpdatesPlugin({ pollIntervalObject: 30000 })],
})
```

## useObjectStore

The return value of `createObjectStore` — a standard Pinia composable. Call it inside `setup()` or `<script setup>` to access the store instance.

## emptyPaginated

Helper that returns an empty pagination state object (used by sub-resource plugins, not the main store's pagination getter):

```js
import { emptyPaginated } from '@conduction/nextcloud-vue'

const pagination = emptyPaginated()
// { results: [], total: 0, page: 1, pages: 0, limit: 20, offset: 0 }
```

Useful for initializing component state before data loads. Accepts an optional `limit` argument (default 20).
