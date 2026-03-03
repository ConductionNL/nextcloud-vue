---
sidebar_position: 1
---

# Composables

Vue composables that encapsulate common view patterns.

## useListView

Manages list page state — search, filters, sorting, pagination. Pairs with CnIndexPage.

```js
import { useListView } from '@conduction/nextcloud-vue'

const {
  objects,
  pagination,
  loading,
  search,
  filters,
  sort,
  fetchPage,
  refresh,
  setSearch,
  setFilter,
  setSort,
  setPageSize,
} = useListView({
  objectStore,
  objectType: 'contact',
  defaultPageSize: 20,
  defaultSort: { key: 'name', order: 'asc' },
})
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `objectStore` | Store | Object store instance |
| `objectType` | String | Registered object type slug |
| `defaultPageSize` | Number | Initial page size (default: 20) |
| `defaultSort` | Object | `\{ key, order \}` initial sort |
| `autoFetch` | Boolean | Fetch on mount (default: true) |

### Return Value

| Property/Method | Type | Description |
|----------------|------|-------------|
| `objects` | Ref\<Array\> | Current page of objects |
| `pagination` | Ref\<Object\> | Pagination state |
| `loading` | Ref\<Boolean\> | Loading state |
| `search` | Ref\<String\> | Current search term |
| `filters` | Ref\<Object\> | Active filters |
| `sort` | Ref\<Object\> | `\{ key, order \}` |
| `fetchPage(n)` | Function | Fetch specific page |
| `refresh()` | Function | Re-fetch current page |
| `setSearch(term)` | Function | Update search (debounced) |
| `setFilter(key, values)` | Function | Update filter |
| `setSort(key, order)` | Function | Update sort |
| `setPageSize(size)` | Function | Update page size |

## useDetailView

Manages detail page state — load, edit, delete. Pairs with a detail view page.

```js
import { useDetailView } from '@conduction/nextcloud-vue'

const {
  object,
  loading,
  saving,
  error,
  fetch,
  save,
  remove,
} = useDetailView({
  objectStore,
  objectType: 'contact',
  id: props.contactId,
})
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `objectStore` | Store | Object store instance |
| `objectType` | String | Registered object type slug |
| `id` | String/Ref | Object ID (reactive) |
| `autoFetch` | Boolean | Fetch on mount (default: true) |

### Return Value

| Property/Method | Type | Description |
|----------------|------|-------------|
| `object` | Ref\<Object\> | The fetched object |
| `loading` | Ref\<Boolean\> | Loading state |
| `saving` | Ref\<Boolean\> | Save in progress |
| `error` | Ref\<String\> | Error message |
| `fetch()` | Function | (Re)fetch the object |
| `save(data)` | Function | Update the object |
| `remove()` | Function | Delete the object |

## useSubResource

Manages sub-resources on an object (e.g., notes, comments).

```js
import { useSubResource } from '@conduction/nextcloud-vue'

const {
  items,
  loading,
  add,
  remove,
  refresh,
} = useSubResource({
  objectStore,
  parentType: 'contact',
  parentId: props.contactId,
  subResourceType: 'notes',
})
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `objectStore` | Store | Object store instance (with createSubResourcePlugin) |
| `parentType` | String | Parent object type |
| `parentId` | String/Ref | Parent object ID (reactive) |
| `subResourceType` | String | Sub-resource name (matches plugin name) |
| `autoFetch` | Boolean | Fetch on mount (default: true) |

### Return Value

| Property/Method | Type | Description |
|----------------|------|-------------|
| `items` | Ref\<Array\> | Sub-resource items |
| `loading` | Ref\<Boolean\> | Loading state |
| `add(data)` | Function | Create sub-resource |
| `remove(id)` | Function | Delete sub-resource |
| `refresh()` | Function | Re-fetch items |
