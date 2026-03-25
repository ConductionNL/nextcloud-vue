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

#### Scenario: pagination is forwarded

- GIVEN `useListView('client')` is in use
- WHEN `objectStore.pagination.client` contains `{ page: 2, pages: 5, total: 98, limit: 20 }`
- THEN the `pagination` computed ref returns that same object

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

---

### Requirement: fetch with params

`useListView` SHALL provide a `refresh(page?)` function that builds API params from current state (`searchTerm`, `sortKey`, `sortOrder`, `activeFilters`, `pageSize`) and calls `objectStore.fetchCollection(objectType, params)`. All param construction logic MUST live inside the composable.

#### Scenario: search param is included when set

- GIVEN `searchTerm.value` is `'acme'`
- WHEN `refresh()` is called
- THEN `objectStore.fetchCollection` is called with `{ _search: 'acme', _limit: 20, _page: 1 }`

#### Scenario: sort param is included when set

- GIVEN `sortKey.value` is `'name'` and `sortOrder.value` is `'desc'`
- WHEN `refresh()` is called
- THEN params include `{ _order: { name: 'desc' } }`

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

---

### Requirement: event handlers

`useListView` SHALL return `onSearch`, `onSort`, `onFilterChange`, `onPageChange`, and `onPageSizeChange` functions that update internal state and call `refresh`. `onSearch` MUST debounce by 300 ms by default.

#### Scenario: onSearch debounces

- GIVEN a component binds `@search="onSearch"` on `CnIndexPage`
- WHEN the user types three characters within 200 ms
- THEN `refresh()` is called exactly once (after the 300 ms debounce settles)

#### Scenario: onSort updates state and refreshes

- GIVEN `sortKey.value` is `null`
- WHEN `onSort({ key: 'email', order: 'asc' })` is called
- THEN `sortKey.value` becomes `'email'`, `sortOrder.value` becomes `'asc'`, and `refresh(1)` is called

#### Scenario: onFilterChange updates activeFilters

- GIVEN `activeFilters.value` is `{}`
- WHEN `onFilterChange('type', ['person'])` is called
- THEN `activeFilters.value` becomes `{ type: ['person'] }` and `refresh(1)` is called

#### Scenario: onFilterChange clears empty values

- GIVEN `activeFilters.value` is `{ type: ['person'] }`
- WHEN `onFilterChange('type', [])` is called
- THEN `activeFilters.value.type` is removed (or `undefined`) and `refresh(1)` is called

---

### Requirement: sidebar wiring

When `options.sidebarState` is provided, `useListView` SHALL automatically wire and unwire the sidebar on mount/unmount. The component MUST NOT implement `setupSidebar` or `teardownSidebar` methods.

#### Scenario: sidebar is activated on mount

- GIVEN `useListView('client', { sidebarState })` is used
- WHEN the component is mounted
- THEN `sidebarState.active` is `true`, `sidebarState.schema` matches the loaded schema, and `sidebarState.onSearch` / `onColumnsChange` / `onFilterChange` callbacks are set

#### Scenario: sidebar is deactivated on unmount

- GIVEN the sidebar is active
- WHEN the component is destroyed (route change)
- THEN `sidebarState.active` is `false`, `sidebarState.schema` is `null`, and all callback refs are `null`

#### Scenario: facetData is pushed to sidebar after fetch

- GIVEN `options.sidebarState` is provided
- WHEN `refresh()` completes
- THEN `sidebarState.facetData` is set to `objectStore.facets[objectType]`

#### Scenario: visibleColumns syncs from sidebar

- GIVEN the sidebar's `onColumnsChange` callback is wired
- WHEN the user toggles a column in the sidebar
- THEN `visibleColumns.value` returned by the composable is updated

---

### Requirement: backward compatibility

The existing `useListView()` call signature (no arguments) SHALL continue to work. All new parameters are optional. No existing consumer is broken by this change.

#### Scenario: zero-argument call still works

- GIVEN existing code calls `useListView()` with no arguments
- WHEN the enhanced composable is imported
- THEN the call does not throw and returns the same state refs as before (`searchTerm`, `filters`, `sortKey`, `sortOrder`, etc.)
