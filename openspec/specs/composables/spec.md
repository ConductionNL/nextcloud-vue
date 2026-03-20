---
status: reviewed
---

# Composables — Spec

## Purpose

Specifies the Vue composables exported by `@conduction/nextcloud-vue`: `useListView`, `useDetailView`, `useSubResource`, and `useDashboardView`. These composables encapsulate reactive state management patterns for list pages, detail pages, sub-resource fetching, and dashboard layouts, integrating with the `useObjectStore` Pinia store and the Nextcloud platform APIs.

**Files**: `src/composables/useListView.js`, `src/composables/useDetailView.js`, `src/composables/useSubResource.js`, `src/composables/useDashboardView.js`, `src/composables/index.js`

**Cross-references**: [index-page](../index-page/spec.md), [dashboard-page](../dashboard-page/spec.md), [store](../store/spec.md), [use-list-view](../use-list-view/spec.md), [use-detail-view](../use-detail-view/spec.md), [use-dashboard-view](../use-dashboard-view/spec.md)

---

## Requirements

### Requirement: REQ-CO-001 — useListView New API: Store-Integrated List State

The new API `useListView(objectType: string, options?)` MUST integrate with `useObjectStore` to manage schema loading, collection fetching, search, sort, filter, pagination, sidebar wiring, and cleanup. It returns reactive state and event handlers that bind directly to `CnIndexPage` props and events.

**Signature:** `useListView(objectType: string, options?: { sidebarState?, defaultPageSize?: number, debounceMs?: number, defaultSort?: { key: string, order: string } })`

**Returns:** `{ schema, objects, loading, pagination, searchTerm, sortKey, sortOrder, activeFilters, visibleColumns, pageSize, onSearch, onSort, onFilterChange, onPageChange, onPageSizeChange, refresh }`

#### Scenario: Schema loading and initial fetch on mount

- GIVEN `useListView('lead')` is called inside a component `setup()`
- WHEN the component mounts
- THEN `objectStore.fetchSchema('lead')` MUST be called
- AND `schema` ref MUST be populated with the returned schema
- AND `refresh(1)` MUST be called to fetch the first page
- AND `loading` MUST be `true` during the fetch and `false` after

#### Scenario: Search with configurable debounce

- GIVEN `useListView('lead', { debounceMs: 500 })`
- WHEN `onSearch('gemeente')` is called
- THEN `searchTerm.value` MUST immediately be `'gemeente'`
- AND a fetch MUST be triggered after 500ms debounce (not immediately)
- AND calling `onSearch('amsterdam')` within the 500ms window MUST cancel the previous timer and start a new 500ms debounce
- AND the fetch MUST reset to page 1

#### Scenario: Sort via onSort event handler

- GIVEN `useListView('lead')` with default sort `null`
- WHEN `onSort({ key: 'value', order: 'desc' })` is called
- THEN `sortKey.value` MUST be `'value'` and `sortOrder.value` MUST be `'desc'`
- AND `refresh(1)` MUST be called with `_order: { value: 'desc' }` in params
- AND the fetch MUST reset to page 1

#### Scenario: Filter change resets pagination

- GIVEN `useListView('lead')` and the user is on page 3
- WHEN `onFilterChange('status', ['active', 'pending'])` is called
- THEN `activeFilters.value` MUST contain `{ status: ['active', 'pending'] }`
- AND `refresh(1)` MUST be called (page resets to 1)
- AND the API params MUST include `status: ['active', 'pending']`

#### Scenario: Filter removal on empty array

- GIVEN `activeFilters` contains `{ status: ['active'] }`
- WHEN `onFilterChange('status', [])` is called
- THEN the `status` key MUST be removed from `activeFilters.value`
- AND a refresh MUST be triggered

### Requirement: REQ-CO-002 — useListView Pagination and Page Size

The composable MUST support page navigation and configurable page size, both triggering collection re-fetches.

#### Scenario: Page navigation

- GIVEN `useListView('client', { defaultPageSize: 20 })`
- WHEN `onPageChange(3)` is called
- THEN `refresh(3)` MUST be called
- AND the API params MUST include `_page: 3` and `_limit: 20`

#### Scenario: Page size change resets to page 1

- GIVEN the user is on page 5
- WHEN `onPageSizeChange(50)` is called
- THEN `pageSize.value` MUST be `50`
- AND `refresh(1)` MUST be called (page resets to 1)
- AND subsequent fetches MUST use `_limit: 50`

#### Scenario: Pagination state from store

- GIVEN `useListView('client')` and the store returns `pagination: { total: 150, page: 2, pages: 8, limit: 20 }`
- WHEN `pagination` computed is accessed
- THEN it MUST return `{ total: 150, page: 2, pages: 8, limit: 20 }`
- AND it MUST reactively update when the store pagination changes

### Requirement: REQ-CO-003 — useListView Sidebar Wiring

When a `sidebarState` object is provided, the composable MUST wire search, column visibility, and filter callbacks to the sidebar, and tear them down on unmount.

#### Scenario: Sidebar setup on mount

- GIVEN `useListView('lead', { sidebarState: inject('sidebarState') })`
- WHEN the component mounts
- THEN `sidebarState.active` MUST be set to `true`
- AND `sidebarState.schema` MUST be set to the loaded schema
- AND `sidebarState.onSearch` MUST be wired to the composable `onSearch` function
- AND `sidebarState.onFilterChange` MUST be wired to receive `{ key, values }` and delegate to `onFilterChange(key, values)`
- AND `sidebarState.onColumnsChange` MUST update `visibleColumns`

#### Scenario: Facet data push to sidebar

- GIVEN sidebar is wired and the store updates `facets['lead']`
- WHEN facet data changes in the store
- THEN `sidebarState.facetData` MUST be reactively updated with the new facets

#### Scenario: Sidebar teardown on unmount

- GIVEN sidebar is wired
- WHEN the component unmounts
- THEN `sidebarState.active` MUST be set to `false`
- AND `sidebarState.schema`, `sidebarState.onSearch`, `sidebarState.onColumnsChange`, `sidebarState.onFilterChange` MUST be set to `null`
- AND `sidebarState.facetData` MUST be cleared to `{}`

### Requirement: REQ-CO-004 — useListView Legacy API Backward Compatibility

The legacy API `useListView(options?: object)` MUST remain fully functional for existing consumers. When the first argument is an object or absent, the legacy implementation MUST be used.

**Legacy signature:** `useListView({ objectType?, fetchFn?, debounceMs?, pageSize?, defaultSort? })`

**Legacy returns:** `{ searchTerm, filters, sortKey, sortOrder, currentPage, pageSize, onSearchInput, toggleSort, setFilter, clearAllFilters, goToPage, fetch, buildFetchParams }`

#### Scenario: Legacy sort cycling (asc -> desc -> null)

- GIVEN `useListView({ objectType: 'lead', fetchFn })`
- WHEN `toggleSort('value')` is called once
- THEN `sortKey` MUST be `'value'` and `sortOrder` MUST be `'asc'`
- WHEN `toggleSort('value')` is called again
- THEN `sortOrder` MUST be `'desc'`
- WHEN `toggleSort('value')` is called a third time
- THEN `sortKey` MUST be `null` and `sortOrder` MUST reset to `'asc'`

#### Scenario: Legacy clearAllFilters resets all state

- GIVEN search, filters, and sort have been set
- WHEN `clearAllFilters()` is called
- THEN `searchTerm` MUST be `''`, `filters` MUST be `{}`, sort MUST reset to defaults
- AND a fetch MUST be triggered at page 1

#### Scenario: API detection at runtime

- GIVEN `useListView('lead')` is called with a string
- THEN the new store-integrated API MUST be used
- GIVEN `useListView({ objectType: 'lead' })` is called with an object
- THEN the legacy API MUST be used
- GIVEN `useListView()` is called with no arguments
- THEN the legacy API MUST be used with empty defaults

### Requirement: REQ-CO-005 — useDetailView New API: Store-Integrated Detail State

The new API `useDetailView(objectType: string, id: string | Ref<string>, options?)` MUST integrate with `useObjectStore` to manage loading, saving, deleting, validation errors, and optional router navigation.

**Signature:** `useDetailView(objectType: string, id: string | Ref<string>, options?: { router?, listRouteName?, detailRouteName?, nameField? })`

**Returns:** `{ object, loading, isNew, editing, saving, showDeleteDialog, error, validationErrors, onSave, confirmDelete }`

#### Scenario: Auto-fetch on mount

- GIVEN `useDetailView('client', '123')`
- WHEN the component mounts
- THEN `objectStore.fetchObject('client', '123')` MUST be called
- AND `object` computed MUST return the fetched object from the store
- AND `loading` MUST be `true` during fetch

#### Scenario: New object detection

- GIVEN `useDetailView('client', 'new')`
- WHEN `isNew` is accessed
- THEN it MUST be `true`
- AND `object` computed MUST return `{}`
- AND no fetch MUST be triggered on mount

#### Scenario: Re-fetch on id change

- GIVEN `useDetailView('client', idRef)` where `idRef` is a Vue ref
- WHEN `idRef.value` changes from `'123'` to `'456'`
- THEN `objectStore.fetchObject('client', '456')` MUST be called automatically via watch

#### Scenario: Save with validation error handling (422)

- GIVEN `useDetailView('client', '123')`
- WHEN `onSave({ title: '' })` is called and the API returns HTTP 422 with `{ errors: { title: 'Required' } }`
- THEN `saving` MUST be `true` during the request and `false` after
- AND `validationErrors.value` MUST be `{ title: 'Required' }`
- AND `error.value` MUST remain `null` (validation errors are separate)

#### Scenario: Save with router navigation on create

- GIVEN `useDetailView('lead', 'new', { router, detailRouteName: 'LeadDetail' })`
- WHEN `onSave({ title: 'New Lead' })` succeeds and returns `{ id: '789' }`
- THEN `router.push({ name: 'LeadDetail', params: { id: '789' } })` MUST be called

### Requirement: REQ-CO-006 — useDetailView Delete with Navigation

The `confirmDelete` function MUST delete the object via the store and optionally navigate to the list route on success.

#### Scenario: Successful delete with router navigation

- GIVEN `useDetailView('client', '123', { router, listRouteName: 'ClientList' })`
- WHEN `confirmDelete()` is called and the store returns `true`
- THEN `showDeleteDialog.value` MUST be set to `false`
- AND `router.push({ name: 'ClientList' })` MUST be called

#### Scenario: Failed delete sets error

- GIVEN `useDetailView('client', '123')`
- WHEN `confirmDelete()` is called and the store returns `false`
- THEN `error.value` MUST contain a failure message
- AND `showDeleteDialog.value` MUST remain unchanged

#### Scenario: Delete exception handling

- GIVEN `useDetailView('client', '123')`
- WHEN `confirmDelete()` throws an exception with message `'Network error'`
- THEN `error.value` MUST be `'Network error'`
- AND the function MUST return `false`

### Requirement: REQ-CO-007 — useDetailView Legacy API Backward Compatibility

The legacy API `useDetailView(options?: object)` MUST remain fully functional. When the first argument is an object or absent, the legacy implementation MUST be used.

**Legacy returns:** `{ objectData, editing, loading, saving, showDeleteDialog, error, load, save, confirmDelete, executeDelete }`

#### Scenario: Legacy explicit load

- GIVEN `useDetailView({ objectType: 'lead', fetchFn })`
- WHEN `load('123')` is called
- THEN `loading` MUST be `true` during the fetch
- AND `objectData` MUST contain the result after success

#### Scenario: Legacy save with callback

- GIVEN `useDetailView({ objectType: 'lead', saveFn, onSaved: callback })`
- WHEN `save({ title: 'Updated' })` succeeds
- THEN `saving` MUST transition from `true` to `false`
- AND `editing` MUST be set to `false`
- AND `onSaved(result)` callback MUST be invoked with the saved object

#### Scenario: Legacy two-step delete flow

- GIVEN `useDetailView({ objectType: 'lead', deleteFn, onDeleted: callback })`
- WHEN `confirmDelete()` is called
- THEN `showDeleteDialog.value` MUST be set to `true` (no actual deletion)
- WHEN `executeDelete('123')` is then called
- THEN `deleteFn('lead', '123')` MUST be called
- AND on success, `showDeleteDialog` MUST be `false` and `onDeleted` callback MUST fire

### Requirement: REQ-CO-008 — useSubResource: Component-Scoped Sub-Resource Fetching

The composable MUST provide standalone sub-resource fetching outside the Pinia store, with component-scoped reactive state, error handling, and an optional transform function.

**Signature:** `useSubResource(store: object, endpoint: string, options?: { transform?: Function, limit?: number })`

**Returns:** `{ data: reactive({ results, total, page, pages, limit, offset }), loading, error, fetch, clear }`

#### Scenario: Fetch sub-resources for a parent object

- GIVEN `useSubResource(store, 'tasks')` where the store has `'case'` registered
- WHEN `fetch('case', 'abc-123')` is called
- THEN `loading.value` MUST be `true` during the request
- AND the URL MUST be `{baseUrl}/{register}/{schema}/abc-123/tasks`
- AND `data.results` MUST contain the response results
- AND `data.total`, `data.page`, `data.pages` MUST be populated from the response

#### Scenario: Transform function applied to results

- GIVEN `useSubResource(store, 'tasks', { transform: (t) => ({ id: t.uid, title: t.summary }) })`
- WHEN `fetch('case', 'abc-123')` returns `[{ uid: '1', summary: 'Review' }]`
- THEN `data.results` MUST be `[{ id: '1', title: 'Review' }]`

#### Scenario: Unregistered object type throws error

- GIVEN `useSubResource(store, 'tasks')` where `'unknown'` is NOT in `store.objectTypeRegistry`
- WHEN `fetch('unknown', 'abc-123')` is called
- THEN the function MUST throw `Error('Object type "unknown" is not registered in the store.')`

#### Scenario: Clear resets all state

- GIVEN `data.results` contains items and `loading` is `false`
- WHEN `clear()` is called
- THEN `data.results` MUST be `[]`, `data.total` MUST be `0`, `data.page` MUST be `1`
- AND `loading` MUST be `false` and `error` MUST be `null`

#### Scenario: Network error handling

- GIVEN `useSubResource(store, 'tasks')`
- WHEN `fetch('case', 'abc-123')` fails with a `TypeError` (network failure)
- THEN `error.value` MUST be set via `networkError(err)`
- AND `data.results` MUST remain `[]` (empty fallback)
- AND `loading.value` MUST be `false`

### Requirement: REQ-CO-009 — useDashboardView: Dashboard State Management

The composable MUST manage widget definitions, layout state, NC widget loading, layout persistence, and widget add/remove operations.

**Signature:** `useDashboardView(options?: { widgets?: Array, defaultLayout?: Array, loadLayout?: Function, saveLayout?: Function, includeNcWidgets?: boolean, columns?: number })`

**Returns:** `{ widgets, layout, loading, saving, isEditing, activeWidgetIds, availableWidgets, ncWidgets, onLayoutChange, addWidget, removeWidget, setWidgets, init }`

#### Scenario: Initialize with default layout

- GIVEN `useDashboardView({ widgets: [{ id: 'kpis', title: 'KPIs', type: 'custom' }], defaultLayout: [{ id: 1, widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }] })`
- WHEN the component mounts
- THEN `layout.value` MUST be the default layout
- AND `widgets.value` MUST contain the app widgets

#### Scenario: Load saved layout from persistence

- GIVEN `useDashboardView({ loadLayout: () => Promise.resolve(savedLayout), defaultLayout })` where `savedLayout` is a non-empty array
- WHEN the component mounts and `init()` runs
- THEN `layout.value` MUST be `savedLayout` (not `defaultLayout`)
- AND `loading` MUST be `true` during init and `false` after

#### Scenario: Fallback to default on empty saved layout

- GIVEN `useDashboardView({ loadLayout: () => Promise.resolve([]), defaultLayout })`
- WHEN the component mounts
- THEN `layout.value` MUST be `defaultLayout`

#### Scenario: Load NC Dashboard API widgets

- GIVEN `useDashboardView({ includeNcWidgets: true, widgets: appWidgets })`
- WHEN `init()` runs
- THEN `GET /apps/dashboard/api/v1/widgets` (OCS) MUST be called
- AND `ncWidgets.value` MUST contain the mapped NC widget objects with `type: 'nc-widget'`
- AND `widgets` computed MUST return `[...appWidgets, ...ncWidgets]`

#### Scenario: NC widget loading failure is non-fatal

- GIVEN `useDashboardView({ includeNcWidgets: true })`
- WHEN the OCS endpoint returns an error
- THEN `ncWidgets.value` MUST be `[]` (empty, not an error state)
- AND `layout.value` MUST still be initialized from defaults or saved layout

### Requirement: REQ-CO-010 — useDashboardView: Widget Add, Remove, and Layout Persistence

The composable MUST support adding widgets at auto-calculated positions, removing widgets by layout item ID, and persisting layout changes via the `saveLayout` callback.

#### Scenario: Add widget at next available position

- GIVEN layout has items with max `gridY + gridHeight = 5` and max `id = 3`
- WHEN `addWidget('chart')` is called
- THEN a new layout item MUST be added with `id: 4`, `widgetId: 'chart'`, `gridX: 0`, `gridY: 5`, `gridWidth: 6`, `gridHeight: 3`
- AND `onLayoutChange` MUST be called with the updated layout

#### Scenario: Add widget with custom position override

- GIVEN `addWidget('chart', { gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 4 })`
- THEN the new item MUST use the provided position values

#### Scenario: Remove widget by layout item ID

- GIVEN layout contains items with ids `[1, 2, 3]`
- WHEN `removeWidget(2)` is called
- THEN `layout.value` MUST only contain items with ids `[1, 3]`
- AND `onLayoutChange` MUST be called to persist

#### Scenario: Layout change triggers persistence

- GIVEN `useDashboardView({ saveLayout: saveFn })`
- WHEN `onLayoutChange(newLayout)` is called
- THEN `layout.value` MUST be updated to `newLayout`
- AND `saving` MUST be `true` during `saveFn(newLayout)` and `false` after
- AND if `saveFn` throws, `saving` MUST still be set to `false`

#### Scenario: Available widgets excludes active ones

- GIVEN `widgets` contains `[{ id: 'a' }, { id: 'b' }, { id: 'c' }]` and layout references widget IDs `['a', 'c']`
- WHEN `availableWidgets` is accessed
- THEN it MUST return `[{ id: 'b' }]`

### Requirement: REQ-CO-011 — Cleanup on Component Unmount

All composables MUST clean up timers, watchers, and external state references when the host component unmounts.

#### Scenario: useListView clears debounce timer

- GIVEN `useListView('lead')` with a pending search debounce timer
- WHEN the component unmounts (`onBeforeUnmount` fires)
- THEN the pending `setTimeout` MUST be cleared via `clearTimeout`
- AND `sidebarState` (if wired) MUST be torn down

#### Scenario: useListView legacy clears debounce timer

- GIVEN `useLegacyListView({ debounceMs: 300 })` with a pending debounce
- WHEN the component unmounts
- THEN the pending `setTimeout` MUST be cleared

#### Scenario: useDashboardView does not leak state

- GIVEN `useDashboardView({ saveLayout: fn })`
- WHEN the component unmounts and a pending `saveLayout` promise resolves
- THEN `saving.value` MUST still be set to `false` (no unhandled state mutation)

### Requirement: REQ-CO-012 — Options API Compatibility

All composables MUST work inside the `setup()` function of Options API components (Vue 2 with Composition API bridge). They MUST NOT require `<script setup>` or Vue 3-only APIs.

#### Scenario: useListView in Options API component

- GIVEN an Options API component with `setup()` returning the composable result
- WHEN `return useListView('lead', { sidebarState })` is called in `setup()`
- THEN all returned refs and functions MUST be accessible in `this` context of the component
- AND `methods` can call `this.onSearch('term')`, `this.refresh()`, etc.

#### Scenario: useDetailView with Options API methods

- GIVEN an Options API component that returns `useDetailView('client', props.id, { router })` from `setup()`
- WHEN `this.onSave(formData)` is called from a method
- THEN the composable function MUST execute correctly with access to store and refs

#### Scenario: Composable spread into setup return

- GIVEN `setup() { return { ...useListView('lead'), ...useDetailView('lead', 'new') } }`
- THEN property names MUST NOT collide (both return `loading` — consumer must alias)
- AND Vue MUST correctly unwrap all returned refs in the template

### Requirement: REQ-CO-013 — Reactive State Management and Computed Derivation

All composable state MUST be reactive. Store-derived values MUST use `computed()` so they update automatically when the underlying store changes.

#### Scenario: objects computed reactivity

- GIVEN `useListView('lead')` where `objectStore.collections['lead']` is initially `[]`
- WHEN the store updates `collections['lead']` to `[{ id: '1' }]`
- THEN `objects.value` MUST reactively update to `[{ id: '1' }]` without explicit refresh

#### Scenario: loading computed reactivity

- GIVEN `useDetailView('client', '123')` where `objectStore.loading['client']` changes from `false` to `true`
- THEN `loading.value` MUST reactively update to `true`

#### Scenario: pagination computed reactivity

- GIVEN `useListView('lead')`
- WHEN the store updates `pagination['lead']` to `{ total: 50, page: 2, pages: 3, limit: 20 }`
- THEN `pagination.value` MUST reactively reflect the new values

#### Scenario: isNew computed from id ref

- GIVEN `useDetailView('client', idRef)` where `idRef = ref('new')`
- WHEN `idRef.value` changes to `'123'`
- THEN `isNew.value` MUST reactively change from `true` to `false`

### Requirement: REQ-CO-014 — Error Handling Patterns

All composables MUST handle errors gracefully, setting error refs and ensuring loading/saving states are reset in `finally` blocks.

#### Scenario: useDetailView save error resets saving state

- GIVEN `useDetailView('client', '123')`
- WHEN `onSave(data)` throws a non-422 error with message `'Server error'`
- THEN `error.value` MUST be `'Server error'`
- AND `saving.value` MUST be `false` (reset in finally block)
- AND `validationErrors.value` MUST remain `null`

#### Scenario: useSubResource HTTP error handling

- GIVEN `useSubResource(store, 'files')`
- WHEN `fetch('case', '123')` receives a non-OK HTTP response
- THEN `error.value` MUST be set via `parseResponseError(response, 'files')`
- AND the function MUST return `[]` (empty array fallback)
- AND `loading.value` MUST be `false`

#### Scenario: useDetailView legacy load error

- GIVEN `useLegacyDetailView({ fetchFn: () => { throw new Error('Timeout') } })`
- WHEN `load('123')` is called
- THEN `error.value` MUST be `'Timeout'`
- AND `loading.value` MUST be `false`
- AND `objectData.value` MUST remain unchanged

### Requirement: REQ-CO-015 — Barrel Export and Composable Composition

All composables MUST be exported from the barrel (`src/composables/index.js` and `src/index.js`). Composables MAY be used together in the same component, and each MUST maintain independent state.

#### Scenario: All composables exported from barrel

- GIVEN `import { useListView, useDetailView, useSubResource, useDashboardView } from '@conduction/nextcloud-vue'`
- THEN all four imports MUST resolve to the composable functions

#### Scenario: Multiple composables in one component

- GIVEN a component that calls both `useListView('lead')` and `useSubResource(store, 'files')` in `setup()`
- THEN each composable MUST maintain independent `loading`, `error` state
- AND changes to one composable's state MUST NOT affect the other

#### Scenario: useListView and useDetailView on the same object type

- GIVEN a split-view component that calls `useListView('client')` and `useDetailView('client', selectedId)`
- THEN `useListView` MUST use `objectStore.collections['client']` for its list
- AND `useDetailView` MUST use `objectStore.getObject('client', id)` for its detail
- AND both MUST share the same underlying Pinia store instance

---

## Standards & References

- **Vue Composition API (via `vue` compatibility):** Composables use `ref`, `computed`, `reactive`, `watch`, `isRef`, `onMounted`, `onBeforeUnmount` from Vue 2's Composition API bridge
- **Pinia integration:** `useListView` (new API) and `useDetailView` (new API) call `useObjectStore()` internally
- **Nextcloud platform:** `useDashboardView` uses `@nextcloud/axios` and `@nextcloud/router` for OCS endpoint access
- **Standalone fetch:** `useSubResource` uses native `fetch` with `buildHeaders()` and `buildQueryString()` utilities — not the Pinia store
- **Backward compatibility:** `useListView` and `useDetailView` maintain dual API (string-based new API + object-based legacy API) detected at runtime via `typeof objectTypeOrOptions`
