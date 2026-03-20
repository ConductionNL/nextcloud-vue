---
sidebar_position: 2
---

# Store Plugins

Plugins extend `createObjectStore` with additional functionality. Pass them in the `plugins` array:

```js
const useObjectStore = createObjectStore('myapp', {
  plugins: [filesPlugin, auditTrailsPlugin, relationsPlugin, registerMappingPlugin],
})
```

## filesPlugin

Adds file attachment management to objects and a shared tags list for file labels.

### Methods Added

| Method | Signature | Description |
|--------|-----------|-------------|
| `uploadFile` | `(type, objectId, file)` | Upload file attachment |
| `fetchFiles` | `(type, objectId)` | List attached files |
| `deleteFile` | `(type, objectId, fileId)` | Remove file attachment |
| `downloadFile` | `(type, objectId, fileId)` | Download file |
| `fetchTags` | `()` | Fetch tags list (e.g. for file labels). API: `GET /apps/openregister/api/tags` returns a plain array of strings. |

### State Added

| Property | Type | Description |
|----------|------|-------------|
| `files` | Array | Current object's file list |
| `uploadProgress` | Number | Upload progress (0-100) |
| `tags` | Array | List of tag strings (from `fetchTags`) |
| `tagsLoading` | Boolean | Whether tags are being fetched |
| `tagsError` | ApiError | null | Last error from fetching tags |

Use the getters `getTags`, `isTagsLoading`, and `getTagsError` to read tags state.

## auditTrailsPlugin

Adds audit trail support at two scopes: **object-scoped** (audit trails for a single object)
and **global** (all audit trails across the system, with statistics, filtering, and delete).

### Usage

```js
import { createObjectStore, auditTrailsPlugin } from '@conduction/nextcloud-vue'

const useMyStore = createObjectStore('myapp', {
  plugins: [auditTrailsPlugin()],
})

const store = useMyStore()

// ── Object-scoped: audit trails for a specific object ──
await store.fetchAuditTrails('case', caseId)
console.log(store.auditTrails.results)

// ── Global: all audit trails ──
await store.fetchGlobalAuditTrails({ _limit: 50, _page: 1 })
console.log(store.globalAuditTrails.results)
console.log(store.globalAuditTrails.total)

// Statistics
const stats = await store.fetchAuditTrailStatistics()
console.log(stats) // { total: 120, create: 40, update: 50, delete: 20, read: 10 }

// Filters (audit trail-specific, does not conflict with other plugin state)
store.setAuditTrailFilters({ action: 'create', register: '1' })
console.log(store.auditTrailFilters)

// Detail item (for modals)
store.setAuditTrailItem(someAuditTrail)
console.log(store.auditTrailItem)

// Delete
await store.deleteGlobalAuditTrail(id)
await store.deleteMultipleGlobalAuditTrails([id1, id2])

// Refresh with current pagination
await store.refreshGlobalAuditTrails()

// Clear everything
store.clearAuditTrails()
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | `number` | `20` | Default page size for object-scoped queries |
| `globalLimit` | `number` | `50` | Default page size for global queries |

### State Added

**Object-scoped** (from `createSubResourcePlugin`):

| Property | Type | Description |
|----------|------|-------------|
| `auditTrails` | `{ results, total, page, pages, limit, offset }` | Paginated audit trails for a specific object |
| `auditTrailsLoading` | `boolean` | Loading state for object-scoped fetch |
| `auditTrailsError` | `ApiError \| null` | Error from object-scoped fetch |

**Global**:

| Property | Type | Description |
|----------|------|-------------|
| `globalAuditTrails` | `{ results, total, page, pages, limit, offset }` | Paginated audit trails from the global endpoint |
| `globalAuditTrailsLoading` | `boolean` | Loading state for global operations |
| `globalAuditTrailsError` | `ApiError \| null` | Error from global operations |
| `auditTrailStatistics` | `{ total, create, update, delete, read }` | Action count statistics |
| `auditTrailStatisticsLoading` | `boolean` | Loading state for statistics |
| `auditTrailStatisticsError` | `ApiError \| null` | Error from statistics fetch |
| `auditTrailItem` | `object \| null` | Currently selected audit trail (for detail/modal views) |
| `auditTrailFilters` | `object` | Active filter key-value pairs |
| `auditTrailSearch` | `string` | Active search term |

### Getters Added

| Getter | Returns | Description |
|--------|---------|-------------|
| `getAuditTrails` | `{ results, total, ... }` | Object-scoped paginated state |
| `isAuditTrailsLoading` | `boolean` | Object-scoped loading state |
| `getAuditTrailsError` | `ApiError \| null` | Object-scoped error |
| `getGlobalAuditTrails` | `{ results, total, ... }` | Global paginated state |
| `isGlobalAuditTrailsLoading` | `boolean` | Global loading state |
| `getGlobalAuditTrailsError` | `ApiError \| null` | Global error |
| `getAuditTrailStatistics` | `{ total, create, ... }` | Statistics |
| `isAuditTrailStatisticsLoading` | `boolean` | Statistics loading state |
| `getAuditTrailStatisticsError` | `ApiError \| null` | Statistics error |
| `getAuditTrailItem` | `object \| null` | Selected audit trail item |
| `getAuditTrailFilters` | `object` | Active filters |
| `getAuditTrailSearch` | `string` | Active search term |

### Actions Added

**Object-scoped**:

| Action | Signature | Description |
|--------|-----------|-------------|
| `fetchAuditTrails` | `(type, objectId, params?) => Promise<Array>` | Fetch audit trails for a specific object |
| `clearAuditTrails` | `() => void` | Clear all audit trail state (both object-scoped and global) |

**Global fetch & refresh**:

| Action | Signature | Description |
|--------|-----------|-------------|
| `fetchGlobalAuditTrails` | `(params?) => Promise<Array>` | Fetch from the global `/audit-trails` endpoint. Params: `_limit`, `_page`, `_search`, `_order`, plus any filter keys |
| `refreshGlobalAuditTrails` | `() => Promise<Array>` | Re-fetch with current `globalAuditTrails.limit` and `globalAuditTrails.page` |
| `fetchAuditTrailStatistics` | `() => Promise<object>` | Fetch from `/audit-trails/statistics` |

**Global delete**:

| Action | Signature | Description |
|--------|-----------|-------------|
| `deleteGlobalAuditTrail` | `(id) => Promise<boolean>` | Delete a single audit trail. Removes it from `globalAuditTrails.results` on success |
| `deleteMultipleGlobalAuditTrails` | `(ids) => Promise<boolean>` | Bulk delete. Removes matching items from `globalAuditTrails.results` on success |

**Item & filters**:

| Action | Signature | Description |
|--------|-----------|-------------|
| `setAuditTrailItem` | `(item) => void` | Set the active audit trail item (for detail views). Pass `null` to clear |
| `setAuditTrailFilters` | `(filters) => void` | Merge filter key-value pairs into `auditTrailFilters` |
| `setAuditTrailSearch` | `(search) => void` | Set the audit trail search term |
| `clearAuditTrailFilters` | `() => void` | Reset `auditTrailFilters` to `{}` and `auditTrailSearch` to `''` |
| `clearGlobalAuditTrails` | `() => void` | Reset all global state (results, statistics, item, filters) to defaults |

### Notes

- The global endpoint URL is derived from the store's `baseUrl` by replacing `/objects` with `/audit-trails` (e.g. `/apps/openregister/api/objects` becomes `/apps/openregister/api/audit-trails`).
- `auditTrailFilters` and `auditTrailSearch` are audit trail-specific state — they do not conflict with other plugin or store filter state.
- `clearAuditTrails()` clears both object-scoped and global state, ensuring `clearAllSubResources()` works correctly.
- Client-side analytics (action distribution, top objects) are not included — compute these in the consuming component from `globalAuditTrails.results`.

## relationsPlugin

Adds relation management for schema properties with `$ref`.

### Methods Added

| Method | Signature | Description |
|--------|-----------|-------------|
| `fetchRelations` | `(type, objectId)` | Fetch related objects |
| `addRelation` | `(type, objectId, relationType, targetId)` | Add relation |
| `removeRelation` | `(type, objectId, relationType, targetId)` | Remove relation |

### State Added

| Property | Type | Description |
|----------|------|-------------|
| `relations` | Object | `\{ relationType: [relatedObjects] \}` |

## registerMappingPlugin

Adds OpenRegister configuration management for admin settings.

### Methods Added

| Method | Signature | Description |
|--------|-----------|-------------|
| `fetchRegisters` | `()` | Fetch available registers |
| `fetchSchemas` | `(registerId?)` | Fetch available schemas |
| `fetchSources` | `()` | Fetch available sources |
| `saveMappings` | `(mappings)` | Save object type mappings |

### State Added

| Property | Type | Description |
|----------|------|-------------|
| `registers` | Array | Available registers |
| `schemas` | Array | Available schemas |
| `sources` | Array | Available sources |

## lifecyclePlugin

Adds lifecycle hook support — before/after create, update, delete.

### Methods Added

| Method | Signature | Description |
|--------|-----------|-------------|
| `onBeforeCreate` | `(type, callback)` | Register before-create hook |
| `onAfterCreate` | `(type, callback)` | Register after-create hook |
| `onBeforeUpdate` | `(type, callback)` | Register before-update hook |
| `onAfterUpdate` | `(type, callback)` | Register after-update hook |
| `onBeforeDelete` | `(type, callback)` | Register before-delete hook |
| `onAfterDelete` | `(type, callback)` | Register after-delete hook |

## selectionPlugin

Adds object selection management — select items by ID, check all-selected state, and toggle selection for an entire type's collection.

### Usage

```js
import { createObjectStore, selectionPlugin } from '@conduction/nextcloud-vue'

const useMyStore = createObjectStore('myapp', {
  plugins: [selectionPlugin()],
})

const store = useMyStore()

// Select specific objects
store.setSelectedObjects(['abc', 'def'])

// Toggle all in a collection
store.toggleSelectAllObjects('invoice')

// Check state
console.log(store.selectedObjects)       // ['abc', 'def', ...]
console.log(store.isAllSelected('invoice')) // true | false

// Clear selection
store.clearSelectedObjects()
```

### State Added

| Property | Type | Description |
|----------|------|-------------|
| `selectedObjects` | `string[]` | IDs of currently selected objects |

### Getters Added

| Getter | Signature | Description |
|--------|-----------|-------------|
| `isAllSelected` | `(type: string) => boolean` | `true` when every object in the collection is selected; `false` when collection is empty |

### Actions Added

| Action | Signature | Description |
|--------|-----------|-------------|
| `setSelectedObjects` | `(ids: string[]) => void` | Replace the selection with the given IDs |
| `clearSelectedObjects` | `() => void` | Deselect everything |
| `toggleSelectAllObjects` | `(type: string) => void` | Select all if not all selected, deselect all otherwise |

### Notes

- Object IDs are resolved as `object.id ?? object['@self']?.id` to support both plain and `@self`-wrapped OpenRegister objects.
- The plugin state is shared across types — `selectedObjects` holds IDs from any type. If you need per-type isolation, create separate store instances.

## searchPlugin

Adds a dedicated search context to the store: a single collection slot with its own
pagination, loading state, schema, register, and facet cache — all driven by `searchParams`.
Unlike the main type-keyed collections the search collection is a single, mutable slot
that is replaced on every `refetchSearchCollection` call.

The plugin also exports three standalone helpers:

| Export | Description |
|--------|-------------|
| `SEARCH_TYPE` | Constant `'search'` — import to avoid hard-coding the string |
| `getRegisterApiUrl(registerId)` | Returns `/apps/openregister/api/registers/{id}` |
| `getSchemaApiUrl(schemaId)` | Returns `/apps/openregister/api/schemas/{id}` |

### Usage

```js
import {
  createObjectStore,
  searchPlugin,
  SEARCH_TYPE,
  getRegisterApiUrl,
  getSchemaApiUrl,
} from '@conduction/nextcloud-vue'

const useMyStore = createObjectStore('myapp', {
  plugins: [searchPlugin()],
})

const store = useMyStore()

// Configure the search context
store.setSearchParams({
  register: 'reg-1',
  schema: 'schema-1',
  _search: 'foo',
  _page: 1,
  _limit: 20,
})

// Optional: control visible columns
store.setSearchVisibleColumns(['title', 'status', 'createdAt'])

// Fetch
await store.refetchSearchCollection()

// Read results
console.log(store.searchCollection)    // [{ id: '…', … }, …]
console.log(store.searchPagination)    // { total: 42, page: 1, pages: 3, limit: 20 }
console.log(store.searchLoading)       // false
console.log(store.searchSchema)        // { title: '…', properties: { … } }
console.log(store.searchRegister)      // { title: '…', … }
console.log(store.searchFacets)        // { status: { values: [{ value: 'open', count: 8 }] } }

// Clear results (keeps searchParams)
store.clearSearchCollection()
```

### State Added

| Property | Type | Description |
|----------|------|-------------|
| `searchParams` | `object` | Active query params. Must contain `register` and `schema`; all other keys are forwarded as query-string params (`_search`, `_page`, `_limit`, `_order`, filters, …) |
| `searchVisibleColumns` | `string[]` | Column keys visible in the search results table |

### Getters Added

| Getter | Type | Description |
|--------|------|-------------|
| `searchCollection` | `Array` | Search result objects from the last fetch |
| `searchPagination` | `{ total, page, pages, limit }` | Pagination state from the last fetch |
| `searchLoading` | `boolean` | `true` while a fetch is in progress |
| `searchSchema` | `object\|null` | Schema for the current `register`/`schema` pair (auto-fetched) |
| `searchRegister` | `object\|null` | Register for the current `register`/`schema` pair (auto-fetched) |
| `searchFacets` | `object` | Facet data in CnIndexSidebar format: `{ field: { values: [{ value, count }] } }` |

### Actions Added

| Action | Signature | Description |
|--------|-----------|-------------|
| `setSearchParams` | `(params: object) => void` | Replace search params. Clears the cached schema/register if `schema`/`register` changed |
| `updateSearchParams` | `(params: object) => void` | Merge partial params into existing search params. Only provided keys are overwritten; clears cached schema/register if those keys changed |
| `setSearchVisibleColumns` | `(columns: string[]) => void` | Replace the visible column list |
| `clearSearchCollection` | `() => void` | Reset collection, pagination, and facets. Does not touch `searchParams` |
| `refetchSearchCollection` | `() => Promise<Array>` | Fetch using current `searchParams`. Returns the result array (empty on error) |

### Notes

- `refetchSearchCollection` requires `register` and `schema` in `searchParams`; it logs a warning and returns `[]` if either is missing.
- `searchSchema` and `searchRegister` are fetched as non-blocking side-effects of `refetchSearchCollection` and cached until `register`/`schema` changes.
- Facets are only populated when the API response includes a `facets` key.
- `getRegisterApiUrl` and `getSchemaApiUrl` are pure URL builders — they can be imported and used independently of the store when you only need the URL string.

## createSubResourcePlugin

Factory function for child resource management:

```js
import { createSubResourcePlugin } from '@conduction/nextcloud-vue'

const notesPlugin = createSubResourcePlugin('notes', {
  endpoint: '/api/objects/{register}/{schema}/{id}/notes',
})

const useObjectStore = createObjectStore('myapp', {
  plugins: [notesPlugin],
})
```

### Methods Added (per sub-resource)

| Method | Signature | Description |
|--------|-----------|-------------|
| `fetch\{Name\}` | `(type, objectId)` | Fetch sub-resources |
| `add\{Name\}` | `(type, objectId, data)` | Create sub-resource |
| `remove\{Name\}` | `(type, objectId, subId)` | Delete sub-resource |

### State Added

| Property | Type | Description |
|----------|------|-------------|
| `\{name\}` | Array | Sub-resource items |
| `\{name\}Loading` | Boolean | Loading state |
