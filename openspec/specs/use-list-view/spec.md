# useListView Specification

## Purpose

`useListView(objectType, options?)` is a composable exported by `@conduction/nextcloud-vue` that provides everything a `CnIndexPage`-based list view needs: schema, reactive collection data, loading and pagination state, sidebar wiring, and event handlers for search, sort, filter, and pagination. It eliminates boilerplate that was previously duplicated verbatim across every list-view component.

---

## Requirements

### Requirement: objectStore integration

`useListView` SHALL connect to `useObjectStore()` internally and derive reactive `objects`, `loading`, and `pagination` from the store for the given `objectType`. The component MUST NOT call `useObjectStore()` itself to obtain these values.

#### Scenario: objects reflect store collection

- GIVEN a component uses `useListView('client')`
- WHEN `objectStore.collections.client` changes
- THEN the `objects` ref returned by the composable reflects the updated collection immediately

#### Scenario: loading state is forwarded

- GIVEN `useListView('client')` is in use
- WHEN `objectStore.loading.client` is `true`
- THEN the `loading` computed ref returned by the composable is `true`

#### Scenario: loading defaults to false when absent

- GIVEN `useListView('client')` is in use
- WHEN `objectStore.loading.client` is `undefined`
- THEN the `loading` computed ref returns `false`

#### Scenario: pagination is forwarded

- GIVEN `useListView('client')` is in use
- WHEN `objectStore.pagination.client` contains `{ page: 2, pages: 5, total: 98, limit: 20 }`
- THEN the `pagination` computed ref returns that same object

#### Scenario: pagination defaults when absent

- GIVEN `useListView('client')` is in use
- WHEN `objectStore.pagination.client` is `undefined`
- THEN the `pagination` computed ref returns `{ total: 0, page: 1, pages: 1, limit: 20 }`

---

### Requirement: schema loading on mount

`useListView` SHALL call `objectStore.fetchSchema(objectType)` during the `onMounted` lifecycle hook and expose the result as the `schema` ref. The component MUST NOT call `fetchSchema` manually.

#### Scenario: schema is populated after mount

- GIVEN a component uses `useListView('client')`
- WHEN the component is mounted
- THEN `schema.value` is set to the schema returned by `objectStore.fetchSchema('client')`

#### Scenario: schema is null before mount

- GIVEN a component uses `useListView('client')`
- WHEN the composable is first called (before mount)
- THEN `schema.value` is `null`

#### Scenario: initial data fetch follows schema load

- GIVEN a component uses `useListView('client')`
- WHEN the component is mounted
- THEN `objectStore.fetchSchema('client')` completes before `refresh(1)` is called

---

### Requirement: search debounce

`useListView` SHALL provide an `onSearch(value)` handler that updates `searchTerm` immediately but debounces the API call by `options.debounceMs` (default 300 ms). Rapid successive calls MUST cancel the previous pending timer.

#### Scenario: onSearch debounces rapid input

- GIVEN a component binds `@search="onSearch"` on `CnIndexPage`
- WHEN the user types three characters within 200 ms
- THEN `refresh()` is called exactly once (after the 300 ms debounce settles)

#### Scenario: custom debounce interval

- GIVEN `useListView('client', { debounceMs: 500 })` is in use
- WHEN `onSearch('test')` is called
- THEN `refresh()` is called after 500 ms (not 300 ms)

#### Scenario: searchTerm updates immediately

- GIVEN `searchTerm.value` is `''`
- WHEN `onSearch('acme')` is called
- THEN `searchTerm.value` is `'acme'` immediately (before the debounce timer fires)

#### Scenario: debounce timer is cleared on unmount

- GIVEN `onSearch('test')` was called and the debounce has not yet fired
- WHEN the component is destroyed
- THEN the pending timeout is cleared and `refresh()` is never called

---

### Requirement: fetch with params

`useListView` SHALL provide a `refresh(page?)` function that builds API params from current state (`searchTerm`, `sortKey`, `sortOrder`, `activeFilters`, `pageSize`) and calls `objectStore.fetchCollection(objectType, params)`. All param construction logic MUST live inside the composable.

#### Scenario: search param is included when set

- GIVEN `searchTerm.value` is `'acme'`
- WHEN `refresh()` is called
- THEN `objectStore.fetchCollection` is called with params containing `{ _search: 'acme', _limit: 20, _page: 1 }`

#### Scenario: search param is omitted when empty

- GIVEN `searchTerm.value` is `''`
- WHEN `refresh()` is called
- THEN params do NOT contain a `_search` key

#### Scenario: sort param is included when set

- GIVEN `sortKey.value` is `'name'` and `sortOrder.value` is `'desc'`
- WHEN `refresh()` is called
- THEN params include `{ _order: { name: 'desc' } }`

#### Scenario: sort param is omitted when no sort key

- GIVEN `sortKey.value` is `null`
- WHEN `refresh()` is called
- THEN params do NOT contain an `_order` key

#### Scenario: active filters are included

- GIVEN `activeFilters.value` is `{ status: ['active', 'pending'] }`
- WHEN `refresh()` is called
- THEN params include `{ status: ['active', 'pending'] }`

#### Scenario: single-value filter is unwrapped

- GIVEN `activeFilters.value` is `{ type: ['organisation'] }`
- WHEN `refresh()` is called
- THEN params include `{ type: 'organisation' }` (scalar, not array)

#### Scenario: empty filter values are excluded

- GIVEN `activeFilters.value` is `{ status: [] }`
- WHEN `refresh()` is called
- THEN params do NOT contain a `status` key

#### Scenario: page defaults to 1

- GIVEN current state has various params set
- WHEN `refresh()` is called without arguments
- THEN params include `{ _page: 1 }`

#### Scenario: explicit page is used

- GIVEN current state has various params set
- WHEN `refresh(3)` is called
- THEN params include `{ _page: 3 }`

---

### Requirement: filter state management

`useListView` SHALL return `onFilterChange(key, values)` that adds, replaces, or removes filter keys in `activeFilters` and triggers a `refresh(1)` call. Filter changes MUST always reset to page 1.

#### Scenario: onFilterChange adds a filter

- GIVEN `activeFilters.value` is `{}`
- WHEN `onFilterChange('type', ['person'])` is called
- THEN `activeFilters.value` becomes `{ type: ['person'] }` and `refresh(1)` is called

#### Scenario: onFilterChange replaces a filter

- GIVEN `activeFilters.value` is `{ type: ['person'] }`
- WHEN `onFilterChange('type', ['organisation', 'group'])` is called
- THEN `activeFilters.value.type` becomes `['organisation', 'group']`

#### Scenario: onFilterChange clears empty values

- GIVEN `activeFilters.value` is `{ type: ['person'] }`
- WHEN `onFilterChange('type', [])` is called
- THEN `activeFilters.value` does not contain the `type` key

#### Scenario: onFilterChange with null removes key

- GIVEN `activeFilters.value` is `{ status: ['active'] }`
- WHEN `onFilterChange('status', null)` is called
- THEN `activeFilters.value` does not contain the `status` key

---

### Requirement: sort state management

`useListView` SHALL return `onSort({ key, order })` that updates `sortKey` and `sortOrder` refs and triggers `refresh(1)`. Sort changes MUST always reset to page 1.

#### Scenario: onSort updates state and refreshes

- GIVEN `sortKey.value` is `null`
- WHEN `onSort({ key: 'email', order: 'asc' })` is called
- THEN `sortKey.value` becomes `'email'`, `sortOrder.value` becomes `'asc'`, and `refresh(1)` is called

#### Scenario: onSort defaults order to asc

- GIVEN `sortKey.value` is `null`
- WHEN `onSort({ key: 'name' })` is called (no `order` property)
- THEN `sortOrder.value` becomes `'asc'`

#### Scenario: defaultSort option sets initial state

- GIVEN `useListView('case', { defaultSort: { key: 'deadline', order: 'asc' } })` is used
- WHEN the composable initializes
- THEN `sortKey.value` is `'deadline'` and `sortOrder.value` is `'asc'`

---

### Requirement: pagination state management

`useListView` SHALL return `onPageChange(page)` and `onPageSizeChange(size)` handlers. `onPageSizeChange` MUST reset to page 1.

#### Scenario: onPageChange navigates to page

- GIVEN the composable is in use
- WHEN `onPageChange(3)` is called
- THEN `refresh(3)` is called

#### Scenario: onPageSizeChange updates size and resets page

- GIVEN `pageSize.value` is `20`
- WHEN `onPageSizeChange(50)` is called
- THEN `pageSize.value` becomes `50` and `refresh(1)` is called

#### Scenario: default page size

- GIVEN `useListView('client')` is used without `defaultPageSize` option
- WHEN the composable initializes
- THEN `pageSize.value` is `20`

#### Scenario: custom default page size

- GIVEN `useListView('client', { defaultPageSize: 50 })` is used
- WHEN the composable initializes
- THEN `pageSize.value` is `50`

---

### Requirement: sidebar integration

When `options.sidebarState` is provided, `useListView` SHALL automatically wire and unwire the sidebar on mount/unmount. The component MUST NOT implement `setupSidebar` or `teardownSidebar` methods.

#### Scenario: sidebar is activated on mount

- GIVEN `useListView('client', { sidebarState })` is used
- WHEN the component is mounted
- THEN `sidebarState.active` is `true`, `sidebarState.schema` matches the loaded schema, and `sidebarState.onSearch` / `onColumnsChange` / `onFilterChange` callbacks are set

#### Scenario: sidebar searchValue is initialized

- GIVEN `useListView('client', { sidebarState })` is used
- WHEN the component is mounted
- THEN `sidebarState.searchValue` is set to the current `searchTerm.value`

#### Scenario: sidebar activeFilters initialized to empty

- GIVEN `useListView('client', { sidebarState })` is used
- WHEN the component is mounted
- THEN `sidebarState.activeFilters` is set to `{}`

#### Scenario: sidebar is deactivated on unmount

- GIVEN the sidebar is active
- WHEN the component is destroyed (route change)
- THEN `sidebarState.active` is `false`, `sidebarState.schema` is `null`, and all callback refs are `null`

#### Scenario: facetData is pushed to sidebar reactively

- GIVEN `options.sidebarState` is provided
- WHEN `objectStore.facets[objectType]` changes
- THEN `sidebarState.facetData` is updated to match

#### Scenario: visibleColumns syncs from sidebar

- GIVEN the sidebar's `onColumnsChange` callback is wired
- WHEN the user toggles a column in the sidebar
- THEN `visibleColumns.value` returned by the composable is updated

#### Scenario: sidebar filter triggers composable filter

- GIVEN the sidebar's `onFilterChange` callback is wired
- WHEN the sidebar emits `{ key: 'status', values: ['active'] }`
- THEN `onFilterChange('status', ['active'])` is called in the composable

#### Scenario: no sidebar option means no wiring

- GIVEN `useListView('client')` is used without `sidebarState`
- WHEN the component is mounted
- THEN no sidebar wiring or teardown occurs

---

### Requirement: cleanup on unmount

`useListView` SHALL clean up all side effects during `onBeforeUnmount`: clear debounce timers and teardown sidebar wiring.

#### Scenario: debounce timer cleared on unmount

- GIVEN `onSearch('test')` was called and the debounce has not yet fired
- WHEN the component is destroyed
- THEN the pending timeout is cleared

#### Scenario: sidebar teardown on unmount

- GIVEN sidebar wiring is active
- WHEN the component is destroyed
- THEN `sidebarState.active` is `false`, `sidebarState.facetData` is `{}`, and all callbacks are `null`

---

### Requirement: computed derivations

All store-derived values (`objects`, `loading`, `pagination`) SHALL be Vue `computed` refs that update reactively when the underlying store state changes. They MUST NOT be plain refs that require manual syncing.

#### Scenario: objects updates when store changes

- GIVEN `useListView('client')` is in use and the store collection is `[a, b]`
- WHEN a new fetch adds item `c` to `objectStore.collections.client`
- THEN `objects.value` reactively becomes `[a, b, c]` without manual intervention

#### Scenario: multiple list views share store

- GIVEN both `useListView('client')` and `useListView('lead')` are active
- WHEN `objectStore.collections.client` is updated
- THEN only the client composable's `objects` changes; the lead composable's `objects` is unaffected

---

### Requirement: Options API compatibility

`useListView` MUST be callable from the `setup()` function of an Options API component. The returned refs and functions MUST be directly spreadable into the component's setup return value and accessible as `this.xxx` in Options API methods, computed, and template.

#### Scenario: Options API component usage

- GIVEN an Options API component with `setup() { return useListView('client', { sidebarState }) }`
- WHEN the component is used in a template
- THEN `this.objects`, `this.loading`, `this.pagination`, `this.onSearch`, `this.refresh` etc. are all accessible

#### Scenario: template binding

- GIVEN `useListView` return values are spread into `setup()` return
- WHEN the template references `:objects="objects"` and `@search="onSearch"`
- THEN the bindings work correctly with reactive updates

---

### Requirement: return value contract

`useListView(objectType, options?)` SHALL return an object containing exactly the following keys. No additional keys SHALL be added without updating this spec.

**Store-derived (computed refs):** `schema`, `objects`, `loading`, `pagination`
**Local state (refs):** `searchTerm`, `sortKey`, `sortOrder`, `activeFilters`, `visibleColumns`, `pageSize`
**Event handlers (functions):** `onSearch`, `onSort`, `onFilterChange`, `onPageChange`, `onPageSizeChange`, `refresh`

#### Scenario: return value shape

- GIVEN `useListView('client')` is called
- WHEN the return value is destructured
- THEN all 16 keys are present: `schema`, `objects`, `loading`, `pagination`, `searchTerm`, `sortKey`, `sortOrder`, `activeFilters`, `visibleColumns`, `pageSize`, `onSearch`, `onSort`, `onFilterChange`, `onPageChange`, `onPageSizeChange`, `refresh`

---

### Requirement: backward compatibility

The existing `useListView()` call signature (no arguments or options object) SHALL continue to work by delegating to the legacy implementation. All new parameters are optional. No existing consumer is broken by this change.

#### Scenario: zero-argument call still works

- GIVEN existing code calls `useListView()` with no arguments
- WHEN the enhanced composable is imported
- THEN the call does not throw and returns the legacy state refs: `searchTerm`, `filters`, `sortKey`, `sortOrder`, `currentPage`, `pageSize`, `onSearchInput`, `toggleSort`, `setFilter`, `clearAllFilters`, `goToPage`, `fetch`, `buildFetchParams`

#### Scenario: options-object call still works

- GIVEN existing code calls `useListView({ objectType: 'client', fetchFn: myFn })`
- WHEN the enhanced composable is imported
- THEN the legacy API is used and returns the same interface as before

#### Scenario: string argument uses new API

- GIVEN code calls `useListView('client')`
- WHEN the composable processes the argument
- THEN the new store-integrated API is used (returns `objects`, `onSearch`, etc.)

---

## Current Implementation Status

**Already implemented -- all requirements are fulfilled:**

- **File**: `src/composables/useListView.js`
- **objectStore integration**: Connects to `useObjectStore()` internally. `objects` computed from `objectStore.collections[objectType]`. `loading` from `objectStore.loading[objectType]`. `pagination` from `objectStore.pagination[objectType]`.
- **Schema loading on mount**: `onMounted` calls `objectStore.fetchSchema(objectType)`, then calls `refresh(1)` after schema loads.
- **Fetch with params**: `buildParams(page)` constructs `{ _limit, _page, _search, _order, filters }`. Single-value arrays unwrapped to scalar. Empty filter values excluded. `refresh(page)` calls `objectStore.fetchCollection(objectType, params)`.
- **Search debounce**: `onSearch(value)` updates `searchTerm` immediately, debounced `refresh` by `opts.debounceMs || 300`. Timer cleared on unmount via `clearTimeout(searchTimeout)`.
- **Event handlers**: `onSort({ key, order })` updates state and calls `refresh(1)`. `onFilterChange(key, values)` adds/removes filter keys. `onPageChange(page)` delegates to `refresh(page)`. `onPageSizeChange(size)` updates size and resets to page 1.
- **Sidebar wiring**: `setupSidebar()` sets `sidebarState.active`, `schema`, `searchValue`, `activeFilters`, `onSearch`, `onColumnsChange`, `onFilterChange`. `teardownSidebar()` resets all to null/false/empty. Facet data watched via `watch()` on `objectStore.facets[objectType]` and pushed to `sidebarState.facetData`.
- **Cleanup on unmount**: `onBeforeUnmount` clears search timeout and calls `teardownSidebar()`.
- **Backward compatibility**: First-arg type check delegates to `useLegacyListView()` for object/absent arguments. Legacy API returns `searchTerm`, `filters`, `sortKey`, `sortOrder`, `currentPage`, `pageSize`, `onSearchInput`, `toggleSort`, `setFilter`, `clearAllFilters`, `goToPage`, `fetch`, `buildFetchParams`.

**Consumer usage patterns:**
- `pipelinq`: ClientList, ContactList, LeadList, ProductList, RequestList -- all use `useListView('type', { sidebarState, objectStore })` in Options API `setup()`
- `procest`: CaseList uses `useListView('case', { sidebarState, objectStore, defaultSort })`, TaskList uses same pattern

**Not yet implemented (spec documents desired behavior):**
- URL query parameter sync (deeplink/SPOT pattern) is mentioned in the previous implementation status notes but is not present in the current source code. This would read `_search`, `_sort`, `_order`, `_page`, `_limit` from query params on mount and write state changes back to the URL via `router.replace()`.

## Standards & References

- Vue 3 Composition API (`ref`, `computed`, `watch`, `onMounted`, `onBeforeUnmount`)
- Pinia store integration via `useObjectStore()`
- OpenRegister API query parameters: `_search`, `_order`, `_limit`, `_page`, `_facets`
- Options API compatibility via `setup()` return value spreading

## Specificity Assessment

- **Specific enough to implement?** Yes -- fully implemented with all scenarios covered.
- **Missing/ambiguous:**
  - URL sync / deeplink support is not yet implemented and not specced as a requirement. Consider adding as a future requirement.
  - Schema fetch retry logic (mentioned in prior notes) is not present in current implementation.
  - The `objectStore` option passed by consumers (e.g., `{ objectStore }`) is not used by the composable -- it calls `useObjectStore()` internally. Consumers passing it are providing a no-op option.
- **Open questions:**
  - Should URL sync be added as a future requirement?
  - Should the composable accept and use a custom `objectStore` instance from options, or always use the default?
