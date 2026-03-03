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

Adds file attachment management to objects.

### Methods Added

| Method | Signature | Description |
|--------|-----------|-------------|
| `uploadFile` | `(type, objectId, file)` | Upload file attachment |
| `fetchFiles` | `(type, objectId)` | List attached files |
| `deleteFile` | `(type, objectId, fileId)` | Remove file attachment |
| `downloadFile` | `(type, objectId, fileId)` | Download file |

### State Added

| Property | Type | Description |
|----------|------|-------------|
| `files` | Array | Current object's file list |
| `uploadProgress` | Number | Upload progress (0-100) |

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
