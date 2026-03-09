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
