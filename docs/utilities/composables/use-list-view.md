---
sidebar_position: 1
---

# useListView

Composable that backs a list/index view. Two calling styles are supported:

- **Object-store API** (`useListView(objectType, options)`) — wires straight into [`useObjectStore`](../../store/object-store.md), loads the schema and collection, manages search/sort/filter/pagination state, and optionally sets up sidebar facet wiring on mount. This is the recommended entry point for new code that uses the object store.
- **Legacy API** (`useListView(options)`) — takes an options bag with `fetchFn`, `saveFn`, etc. Preserved for pre-store consumers; no new behaviour is added here.

Both return reactive state + debounced event handlers that map 1:1 onto [`CnIndexPage`](../../components/cn-index-page.md) props and events.

## Signature — object-store API

```js
import { inject } from 'vue'
import { useListView } from '@conduction/nextcloud-vue'

const {
  schema, objects, loading, pagination,
  searchTerm, sortKey, sortOrder, activeFilters, visibleColumns, pageSize,
  onSearch, onSort, onFilterChange, onPageChange, onPageSizeChange, refresh,
} = useListView('client', {
  sidebarState: inject('sidebarState', null),
  defaultPageSize: 20,
  debounceMs: 300,
  defaultSort: { key: 'createdAt', order: 'desc' },
})
```

### Parameters

| Arg | Type | Description |
|-----|------|-------------|
| `objectType` | `string` | Slug registered in the object store (e.g. `'client'`, `'source'`). |
| `options.objectStore` | `object` | Custom store instance from `createObjectStore(id)`. Defaults to the shared `useObjectStore()` singleton. |
| `options.sidebarState` | `object \| null` | Reactive sidebar state from `inject('sidebarState')`. When provided, `setupSidebar`/`teardownSidebar` run on mount/unmount and facet data is pushed on store updates. |
| `options.defaultPageSize` | `number` | Initial `_limit`. Default `20`. |
| `options.debounceMs` | `number` | Search debounce. Default `300`. |
| `options.defaultSort` | `{ key, order }` | Applied on mount. `order` is `'asc'` or `'desc'`. |
| `options.fixedFilters` | `object \| () => object` | A filter map (or a getter returning one) merged into **every** fetch *after* the user's `activeFilters`, so the fixed entries always win over a colliding facet filter. A getter is re-read on each fetch — pass one to derive the map from reactive sources (e.g. route params). Default `{}` — omitting it is behaviourally identical to before. Used by `CnIndexPage` to apply a route-param-scoped `pages[].config.filter`. |

### Return value

Store-derived refs (read-only from the component's perspective):
- `schema` — JSON Schema loaded via `objectStore.fetchSchema(objectType)` on mount.
- `objects` — Current collection (`objectStore.collections[objectType]`).
- `loading` — `objectStore.loading[objectType]`.
- `pagination` — `{ total, page, pages, limit }`, defaulted when the store hasn't populated yet.

Local state refs:
- `searchTerm`, `sortKey`, `sortOrder`, `activeFilters`, `visibleColumns`, `pageSize`.

Event handlers (all trigger a re-fetch, most reset to page 1):
- `onSearch(value)` — Updates `searchTerm`, debounced refresh.
- `onSort({ key, order })` — Replaces sort, refresh.
- `onFilterChange(key, values)` — Merges into `activeFilters`; empty array removes the key.
- `onPageChange(page)` — Refresh at `page`.
- `onPageSizeChange(size)` — Updates `pageSize`, refresh page 1.
- `refresh(page = 1)` — Explicit re-fetch using current state.

### Request params

`buildParams(page)` assembles the query sent to `fetchCollection`:

| Key | Source |
|-----|--------|
| `_limit` | `pageSize` |
| `_page` | caller-supplied `page` |
| `_search` | `searchTerm` (only when non-empty) |
| `_order` | `{ [sortKey]: sortOrder }` (only when `sortKey` is set) |
| `{filterKey}` | `activeFilters[filterKey]` — scalar when the array has one value, array otherwise |
| `{fixedKey}` | `fixedFilters` resolved last (skipping `undefined`/`null`/`''`), so it overrides any colliding `activeFilters` entry |

### Sidebar wiring

When `sidebarState` is provided, on mount the composable writes:
`active`, `schema`, `searchValue`, `activeFilters`, `onSearch`, `onColumnsChange`, `onFilterChange`.
It also installs a `watch` on `objectStore.facets[objectType]` that pushes facet data into `sidebarState.facetData`. On unmount these are cleared.

## Signature — legacy API

```js
const {
  searchTerm, filters, sortKey, sortOrder, currentPage, pageSize,
  onSearchInput, toggleSort, setFilter, clearAllFilters, goToPage,
  fetch, buildFetchParams,
} = useListView({
  objectType: 'client',
  fetchFn: (type, params) => objectStore.fetchCollection(type, params),
  debounceMs: 300,
  pageSize: 20,
  defaultSort: { key: 'name', order: 'asc' },
})
```

The legacy form mirrors the same state shape but exposes lower-level helpers (`toggleSort`, `clearAllFilters`, `setFilter`) and lets the caller supply `fetchFn`. Use it only when you can't adopt the object store yet.

## Related

- [CnIndexPage](../../components/cn-index-page.md) — Primary consumer; its props/events match this composable's return value.
- [useObjectStore](../../store/object-store.md) — Backing store for the object-store API.
