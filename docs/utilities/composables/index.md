---
sidebar_position: 1
---

# Composables

Vue composables that encapsulate common view patterns.

## useListView

Provides everything a `CnIndexPage`-based list view needs: reactive collection data, schema, loading and pagination state, sidebar wiring, and event handlers for search, sort, filter, and pagination — all wired to the object store. A complete list view requires ~40 LOC instead of the ~150 LOC of manual boilerplate.

### Signature

```js
useListView(objectType, options?)
```

### Before / After

```js
// Before — 150 LOC of boilerplate per component
export default {
  data() {
    return { searchTerm: '', sortKey: null, schema: null, visibleColumns: null }
  },
  computed: {
    clients() { return this.objectStore.collections.client },
    loading() { return this.objectStore.loading.client },
  },
  mounted() {
    this.objectStore.fetchSchema('client').then(s => { this.schema = s })
    this.setupSidebar()
    this.fetchClients()
  },
  beforeDestroy() { this.teardownSidebar() },
  methods: {
    setupSidebar() { /* 25 LOC */ },
    teardownSidebar() { /* 10 LOC */ },
    fetchClients() { /* 18 LOC */ },
    onSearch(v) { /* debounce + fetchClients */ },
    // …
  },
}

// After — 10 LOC
setup() {
  const list = useListView('client', {
    sidebarState: inject('sidebarState', null),
  })
  return { ...list, openClient, createNew }
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sidebarState` | Object\|null | `null` | Sidebar state from `inject('sidebarState')`. When provided, wires/unwires the sidebar automatically. |
| `defaultPageSize` | Number | `20` | Default `_limit` sent to the API |
| `debounceMs` | Number | `300` | Search debounce in milliseconds |

### Return Value

| Key | Type | Description |
|-----|------|-------------|
| `schema` | `Ref<Object\|null>` | Schema loaded on mount via `objectStore.fetchSchema` |
| `objects` | `ComputedRef<Array>` | `objectStore.collections[objectType]` |
| `loading` | `ComputedRef<Boolean>` | `objectStore.loading[objectType]` |
| `pagination` | `ComputedRef<Object>` | `objectStore.pagination[objectType]` |
| `searchTerm` | `Ref<String>` | Current search value |
| `sortKey` | `Ref<String\|null>` | Active sort column key |
| `sortOrder` | `Ref<String>` | `'asc'` or `'desc'` |
| `activeFilters` | `Ref<Object>` | Active facet filter values `{ key: string[] }` |
| `visibleColumns` | `Ref<Array\|null>` | Column visibility (synced from sidebar) |
| `pageSize` | `Ref<Number>` | Current page size |
| `onSearch(value)` | Function | Debounced; updates `searchTerm` and calls `refresh(1)` |
| `onSort({ key, order })` | Function | Updates sort state and calls `refresh(1)` |
| `onFilterChange(key, values)` | Function | Updates `activeFilters` and calls `refresh(1)` |
| `onPageChange(page)` | Function | Calls `refresh(page)` |
| `onPageSizeChange(size)` | Function | Updates page size and calls `refresh(1)` |
| `refresh(page?)` | Function | Builds params and calls `objectStore.fetchCollection` |

### Lifecycle behaviour

- **onMounted**: calls `objectStore.fetchSchema`, activates sidebar (if provided), and calls `refresh(1)`
- **onBeforeUnmount**: deactivates sidebar and clears all sidebar callbacks

### Sidebar wiring

When `sidebarState` is provided, the composable sets:

```js
sidebarState.active = true
sidebarState.schema = schema.value
sidebarState.onSearch = onSearch
sidebarState.onColumnsChange = (cols) => { visibleColumns.value = cols }
sidebarState.onFilterChange = ({ key, values }) => onFilterChange(key, values)
// facetData is kept in sync via a watcher on objectStore.facets[objectType]
```

All fields are cleared (set to `null` / `false` / `{}`) in `onBeforeUnmount`.

## useDetailView

Provides reactive object data, save/delete operations, loading state, and optional post-operation router navigation for detail/edit views.

### Signature

```js
useDetailView(objectType, id, options?)
```

`id` may be a plain string or a `Ref<string>` — if reactive, the composable re-fetches whenever it changes (route param changes without full remount).

Pass `'new'` as `id` to create a new object.

### Example

```js
import { useDetailView } from '@conduction/nextcloud-vue'

const {
  object, isNew, loading, saving, editing,
  onSave, confirmDelete, showDeleteDialog,
  error, validationErrors,
} = useDetailView('client', props.clientId, {
  router: useRouter(),
  listRouteName: 'ClientList',
  detailRouteName: 'ClientDetail',
})
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `router` | Object\|null | `null` | Vue Router instance. Enables redirect after create and delete. |
| `listRouteName` | String\|null | `null` | Route name to navigate to after successful delete |
| `detailRouteName` | String\|null | `null` | Route name to navigate to after successful create |
| `nameField` | String | `'title'` | Field shown in error messages |

### Return Value

| Key | Type | Description |
|-----|------|-------------|
| `object` | `ComputedRef<Object>` | Object from store, or `{}` when new |
| `isNew` | `ComputedRef<Boolean>` | `true` when `id` is `'new'` or falsy |
| `loading` | `ComputedRef<Boolean>` | `objectStore.loading[objectType]` |
| `saving` | `Ref<Boolean>` | `true` while save is in flight |
| `editing` | `Ref<Boolean>` | View/edit mode toggle |
| `showDeleteDialog` | `Ref<Boolean>` | Controls delete-confirmation visibility |
| `error` | `Ref<String\|null>` | General error message |
| `validationErrors` | `Ref<Object\|null>` | Field-level errors from a 422 response |
| `onSave(formData)` | Function | Save object; redirect on create or re-fetch on update |
| `confirmDelete()` | Function | Delete object; navigate to `listRouteName` on success |

### Save behaviour

- **New object** (`isNew === true`): calls `objectStore.saveObject` → on success, navigates to `{ name: detailRouteName, params: { id: result.id } }` if `router` + `detailRouteName` are set
- **Existing object** (`isNew === false`): calls `objectStore.saveObject` → on success, sets `editing.value = false` and re-fetches the object
- **422 validation error**: sets `validationErrors.value` to the error map; no redirect
- **Other errors**: sets `error.value`; no redirect

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
