---
sidebar_position: 1
---

# Object Store

The core store system for managing OpenRegister objects via Pinia.

## createObjectStore

Factory function that creates a Pinia store with CRUD operations and plugin support.

```js
import { createObjectStore } from '@conduction/nextcloud-vue'

export const useObjectStore = createObjectStore(storeId, options)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `storeId` | String | Unique Pinia store identifier (e.g., `'myapp-objects'`) |
| `options.plugins` | Array | Array of plugin functions to extend the store |
| `options.baseUrl` | String | Base API URL override |

### Return Value

Returns a `useObjectStore()` composable (Pinia `defineStore` result) with these core methods:

#### Object Type Registration

| Method | Signature | Description |
|--------|-----------|-------------|
| `registerObjectType` | `(slug, config)` | Register an entity type with its OpenRegister config |

Config shape: `\{ source: string, register: string, schema: string \}`

#### CRUD Operations

| Method | Signature | Description |
|--------|-----------|-------------|
| `fetchObjects` | `(type, params?)` | Fetch paginated list |
| `fetchObject` | `(type, id)` | Fetch single object |
| `createObject` | `(type, data)` | Create new object |
| `updateObject` | `(type, id, data)` | Update existing object |
| `deleteObject` | `(type, id)` | Delete object |
| `searchObjects` | `(type, query, params?)` | Full-text search |

#### State

| Property | Type | Description |
|----------|------|-------------|
| `objectList` | Array | Current list of objects |
| `currentObject` | Object | Currently selected object |
| `pagination` | Object | `\{ currentPage, totalPages, totalItems, pageSize \}` |
| `loading` | Boolean | Loading state |
| `error` | String/null | Last error message |

### Usage

```js
import { createObjectStore } from '@conduction/nextcloud-vue'
import { filesPlugin, auditTrailsPlugin, relationsPlugin } from '@conduction/nextcloud-vue'

export const useObjectStore = createObjectStore('myapp-objects', {
  plugins: [filesPlugin, auditTrailsPlugin, relationsPlugin],
})

// In a component
const store = useObjectStore()
store.registerObjectType('contact', {
  source: 'source-uuid',
  register: 'register-uuid',
  schema: 'schema-uuid',
})
await store.fetchObjects('contact', { page: 1, limit: 20 })
```

## useObjectStore

The return value of `createObjectStore` — a standard Pinia composable. Call it inside `setup()` or `<script setup>` to access the store instance.

## emptyPaginated

Helper that returns an empty pagination state object:

```js
import { emptyPaginated } from '@conduction/nextcloud-vue'

const pagination = emptyPaginated()
// { currentPage: 1, totalPages: 0, totalItems: 0, pageSize: 20, results: [] }
```

Useful for initializing component state before data loads.
