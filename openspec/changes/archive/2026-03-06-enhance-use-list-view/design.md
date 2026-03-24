# Design: enhance-use-list-view

## Architecture Overview

`useListView` and `useDetailView` are composables exported by `@conduction/nextcloud-vue` (`src/composables/`). They are used in Vue 2 option-API components via `setup()` (the Composition API bridge is already available as a transitive dependency through `@vue/composition-api`).

Current state: both composables are thin — they manage local reactive state (search term, sort key, filters, page) but have no knowledge of the objectStore, the sidebar, or the router. Every consumer page must wire these up manually.

Target state: both composables accept `objectType` and an `options` bag. They reach into the objectStore via `useObjectStore()` internally, optionally inject `sidebarState`, handle lifecycle setup/teardown via `onMounted`/`onBeforeUnmount`, and return everything a `CnIndexPage` or `CnDetailPage` needs directly.

```
Before:                              After:
──────────────────────────────────   ──────────────────────────────────
ClientList.vue (150 LOC)             ClientList.vue (40 LOC)
  data: searchTerm, sortKey …        setup() {
  computed: objectStore,               const list = useListView('client')
    clients, loading, pagination       return { ...list }
  mounted: fetchSchema,              }
    setupSidebar, fetchClients         ↳ schema, objects, loading,
  beforeDestroy: teardownSidebar         pagination, onSort, onSearch,
  methods: setupSidebar (25 LOC),        onFilterChange, onPageChange
    teardownSidebar (10 LOC),
    fetchClients (18 LOC),
    onSearch, onSort, onFilterChange …
```

## Composable API Design

### `useListView(objectType, options?)`

```js
import { useListView } from '@conduction/nextcloud-vue'

// Minimal — just the store wiring
const { schema, objects, loading, pagination,
        sortKey, sortOrder, searchTerm,
        onSearch, onSort, onFilterChange,
        onPageChange, onPageSizeChange, refresh } = useListView('client')

// With sidebar auto-wiring
const list = useListView('client', {
  sidebarState: inject('sidebarState', null),  // optional
  defaultPageSize: 20,
})
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sidebarState` | Object\|null | `null` | If provided, the composable calls `setupSidebar` on mount and `teardownSidebar` on destroy |
| `defaultPageSize` | Number | `20` | Default `_limit` sent to the API |

**Returns:**

| Key | Type | Description |
|-----|------|-------------|
| `schema` | Ref\<Object\> | Schema for the objectType, loaded on mount |
| `objects` | ComputedRef\<Array\> | `objectStore.collections[objectType]` |
| `loading` | ComputedRef\<Boolean\> | `objectStore.loading[objectType]` |
| `pagination` | ComputedRef\<Object\> | `objectStore.pagination[objectType]` |
| `searchTerm` | Ref\<String\> | Current search input value |
| `sortKey` | Ref\<String\|null\> | Current sort column key |
| `sortOrder` | Ref\<String\> | `'asc'` or `'desc'` |
| `visibleColumns` | Ref\<Array\|null\> | Column visibility (synced from sidebar) |
| `activeFilters` | Ref\<Object\> | Current facet filter values |
| `onSearch(value)` | Function | Debounced; updates `searchTerm` and calls `refresh(1)` |
| `onSort({ key, order })` | Function | Updates sort state and calls `refresh(1)` |
| `onFilterChange(key, values)` | Function | Updates `activeFilters` and calls `refresh(1)` |
| `onPageChange(page)` | Function | Calls `refresh(page)` |
| `onPageSizeChange(size)` | Function | Updates page size and calls `refresh(1)` |
| `refresh(page?)` | Function | Builds params and calls `objectStore.fetchCollection` |

**Lifecycle behaviour (when `sidebarState` is provided):**

- `onMounted`: calls `objectStore.fetchSchema(objectType)`, sets `sidebarState.active = true`, wires callbacks
- `onBeforeUnmount`: sets `sidebarState.active = false`, clears schema, filters, facetData, callbacks

---

### `useDetailView(objectType, id, options?)`

```js
import { useDetailView } from '@conduction/nextcloud-vue'

const { object, isNew, loading, saving,
        onSave, onDelete, editing,
        showDeleteDialog, confirmDelete } = useDetailView('client', props.id, {
  router: useRouter(),          // Vue Router instance — enables post-save redirect
  listRouteName: 'ClientList',  // Route to push to after delete
})
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `router` | Object\|null | `null` | Vue Router instance. If provided, redirects to the detail route after create, and to `listRouteName` after delete |
| `listRouteName` | String | `null` | Route name to navigate to after a successful delete |
| `detailRouteName` | String | `null` | Route name to navigate to after a successful create (receives `{ id: result.id }`) |
| `nameField` | String | `'title'` | Field shown in error messages |

**Returns:**

| Key | Type | Description |
|-----|------|-------------|
| `object` | ComputedRef\<Object\> | `objectStore.getObject(objectType, id)` or `{}` when new |
| `isNew` | ComputedRef\<Boolean\> | `true` when `id === 'new'` or falsy |
| `loading` | ComputedRef\<Boolean\> | `objectStore.loading[objectType]` |
| `saving` | Ref\<Boolean\> | `true` while save is in flight |
| `editing` | Ref\<Boolean\> | View/edit mode toggle |
| `showDeleteDialog` | Ref\<Boolean\> | Controls delete-confirmation visibility |
| `onSave(formData)` | Function | Calls `saveObject`; on success updates or redirects; on 422 calls `setValidationErrors` on the page ref |
| `confirmDelete()` | Function | Calls `deleteObject`; on success navigates to `listRouteName` |
| `onFormResult` | Ref | Pass as `:ref` to `CnIndexPage` to forward result signals to dialogs |

**Lifecycle:**

- `onMounted`: if `!isNew`, calls `objectStore.fetchObject(objectType, id)`
- Watches `id` prop — re-fetches when route param changes without full remount

---

## Implementation Details

### Sidebar wiring (internal to `useListView`)

```js
// Pseudo-code — actual implementation in src/composables/useListView.js
if (options.sidebarState) {
  onMounted(() => {
    sidebarState.active = true
    sidebarState.schema = schema.value
    sidebarState.searchValue = searchTerm.value
    sidebarState.activeFilters = {}
    sidebarState.onSearch = onSearch
    sidebarState.onColumnsChange = (cols) => { visibleColumns.value = cols }
    sidebarState.onFilterChange = ({ key, values }) => onFilterChange(key, values)
  })
  onBeforeUnmount(() => {
    sidebarState.active = false
    sidebarState.schema = null
    sidebarState.activeFilters = {}
    sidebarState.facetData = {}
    sidebarState.onSearch = null
    sidebarState.onColumnsChange = null
    sidebarState.onFilterChange = null
  })
  // Push facetData back after each fetch
  watch(() => objectStore.facets[objectType], (facets) => {
    sidebarState.facetData = facets || {}
  })
}
```

### Fetch params construction

```js
function buildParams(page) {
  const params = { _limit: pageSize.value, _page: page }
  if (searchTerm.value) params._search = searchTerm.value
  if (sortKey.value) params._order = { [sortKey.value]: sortOrder.value }
  for (const [key, values] of Object.entries(activeFilters.value)) {
    if (values?.length > 0) {
      params[key] = values.length === 1 ? values[0] : values
    }
  }
  return params
}
```

### Vue 2 compatibility

The composables use `@vue/composition-api` primitives (`ref`, `computed`, `onMounted`, `onBeforeUnmount`, `watch`, `inject`). These are already used elsewhere in `nextcloud-vue`. No new dependency is introduced.

---

## File Structure

```
src/composables/
  useListView.js      ← enhanced (was 26 LOC, grows to ~100 LOC)
  useDetailView.js    ← enhanced (was 53 LOC, grows to ~120 LOC)
  index.js            ← exports unchanged (both already exported)

docs/utilities/composables/
  index.md            ← update useListView and useDetailView sections
```

No new files. No new dependencies.

---

## Decisions

### 1. Inject `sidebarState` via option, not `inject()` internally

**Chosen**: Pass `sidebarState` as an option.

**Alternative**: Call `inject('sidebarState')` inside the composable.

**Rationale**: `inject()` in a composable works only when called during component `setup()`, which is always the case here — but making it explicit keeps the composable testable in isolation and avoids the "magic inject" anti-pattern. The page still controls whether sidebar wiring is active.

### 2. Return `visibleColumns` from the composable

**Chosen**: `visibleColumns` is a `Ref` managed by the composable, synced from the sidebar's `onColumnsChange` callback.

**Rationale**: Pages currently declare `visibleColumns: null` in data and wire it manually. Returning it from the composable eliminates that duplication without hiding behaviour.

### 3. `useDetailView` watches `id` prop

**Chosen**: The composable accepts a `Ref` or plain value for `id` and watches it.

**Rationale**: Detail views are often kept mounted while the route param changes (e.g. navigating from one client to another). A watcher re-fetches without a full remount.

---

## Trade-offs

| Risk | Mitigation |
|------|-----------|
| Pages using `setup()` need `@vue/composition-api` installed | Already a transitive dep — no new install required |
| Composable is slightly harder to debug than explicit component code | Standard composable pattern; Vue Devtools shows reactive state |
| Sidebar wiring is now implicit — might surprise new developers | Documented clearly; teardown is automatic so leaks are impossible |
| Apps that partially migrated may have mixed patterns | Old pattern still works; migration is opt-in per page |

---

## Migration Plan

1. Release enhanced composables in `nextcloud-vue` (this change)
2. Migrate pipelinq list views one at a time (tracked in tasks.md)
3. Migrate procest list views (tracked separately)
4. After all pages migrated, old boilerplate patterns are just dead code — delete at leisure
