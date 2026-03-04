---
sidebar_position: 3
---

# Store Architecture

The library provides a Pinia-based store system for managing OpenRegister objects.

## createObjectStore

The core factory function creates a Pinia store with CRUD operations and plugin support:

```js
import { createObjectStore } from '@conduction/nextcloud-vue'
import {
  filesPlugin,
  auditTrailsPlugin,
  relationsPlugin,
  registerMappingPlugin,
} from '@conduction/nextcloud-vue'

export const useObjectStore = createObjectStore('myapp-objects', {
  plugins: [filesPlugin, auditTrailsPlugin, relationsPlugin, registerMappingPlugin],
})
```

The store supports multiple object types through `registerObjectType(slug, schemaId, registerId)`:

```js
const store = useObjectStore()
store.registerObjectType('contact', 'schema-id', 'register-id')
store.registerObjectType('company', 'company-schema-id', 'register-id')
```

Once registered, you can perform CRUD operations per type. Use getters to read state (e.g. `getCollection(type)`, `getPagination(type)`):

```js
await store.fetchCollection('contact', { _page: 1, _limit: 20 })
await store.fetchObject('contact', id)
await store.saveObject('contact', data)  // create when no id, update when id present
await store.deleteObject('contact', id)
await store.deleteObjects('contact', [id1, id2, id3])  // mass delete; returns { successfulIds, failedIds }
```

For bulk delete (e.g. after confirmation in `CnMassDeleteDialog`), use `store.deleteObjects(type, ids)`. The action runs each delete in parallel and returns `{ successfulIds, failedIds }` so the UI can show partial success or failure. Optionally refresh the list with `fetchCollection(type, params)` after a successful batch.

## Plugin System

Plugins extend the store with additional functionality:

### filesPlugin

Adds file attachment management and a shared tags list:
- Upload files to objects
- List attached files
- Delete file attachments
- Download files
- Fetch tags list (`fetchTags()`) for file labels; API returns a plain array of strings

### auditTrailsPlugin

Adds audit trail (change history) support:
- Fetch audit trail for an object
- Display change history with timestamps and users

### relationsPlugin

Adds relation management for schema properties with `$ref`:
- Fetch related objects
- Add/remove relations
- Navigate relation chains

### registerMappingPlugin

Adds OpenRegister configuration management:
- Fetch registers and schemas
- Auto-match schemas to object types
- Save configuration mappings

### createSubResourcePlugin

Creates a plugin for managing child resources:

```js
import { createSubResourcePlugin } from '@conduction/nextcloud-vue'

const notesPlugin = createSubResourcePlugin('notes', {
  endpoint: '/api/objects/{register}/{schema}/{id}/notes',
})
```

## Store Initialization Pattern

Apps typically initialize stores at boot time:

```js
// store/store.js
export async function initializeStores() {
  const settingsStore = useSettingsStore()
  const objectStore = useObjectStore()

  // 1. Fetch app settings (which contain register/schema UUIDs)
  await settingsStore.fetchSettings()

  // 2. Register each object type (schemaId, registerId)
  const types = settingsStore.settings.objectTypes
  for (const [slug, config] of Object.entries(types)) {
    objectStore.registerObjectType(slug, config.schema, config.register)
  }
}
```

Then in `App.vue`:

```vue
<template>
  <NcContent app-name="myapp">
    <template v-if="ready">
      <MainMenu />
      <router-view />
    </template>
    <NcLoadingIcon v-else />
  </NcContent>
</template>

<script>
import { initializeStores } from './store/store.js'

export default {
  data: () => ({ ready: false }),
  async mounted() {
    await initializeStores()
    this.ready = true
  },
}
</script>
```

## Composables

Three composables provide common view patterns:

### useListView

Manages list page state — search, filters, sorting, pagination:

```js
import { useListView } from '@conduction/nextcloud-vue'

const { objects, pagination, loading, search, sort, fetchPage } = useListView({
  objectStore,
  objectType: 'contact',
})
```

### useDetailView

Manages detail page state — load, edit, delete:

```js
import { useDetailView } from '@conduction/nextcloud-vue'

const { object, loading, save, remove } = useDetailView({
  objectStore,
  objectType: 'contact',
  id: props.contactId,
})
```

### useSubResource

Manages sub-resources (e.g., notes on a contact):

```js
import { useSubResource } from '@conduction/nextcloud-vue'

const { items, loading, add, remove } = useSubResource({
  objectStore,
  parentType: 'contact',
  parentId: props.contactId,
  subResourceType: 'notes',
})
```
