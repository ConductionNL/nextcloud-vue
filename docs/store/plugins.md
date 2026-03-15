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

Adds change history (audit trail) support.

### Methods Added

| Method | Signature | Description |
|--------|-----------|-------------|
| `fetchAuditTrails` | `(type, objectId)` | Fetch audit trail entries |

### State Added

| Property | Type | Description |
|----------|------|-------------|
| `auditTrails` | Array | Audit trail entries `[\{ timestamp, user, action, changes \}]` |

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
