# Composables — Spec

## Purpose
Specifies the Vue composables: useListView, useDetailView, useSubResource.

**Files**: `src/composables/useListView.js`, `src/composables/useDetailView.js`, `src/composables/useSubResource.js`

---

## Requirements

### REQ-CO-001: useListView — List View State Management

The composable MUST manage search, filter, sort, and pagination state for list views.

#### Scenario: Search with debounce

- GIVEN `useListView({ objectType: 'lead', fetchFn, debounceMs: 300 })`
- WHEN `onSearchInput('gemeente')` is called
- THEN a fetch MUST be triggered after 300ms debounce
- AND `searchTerm` MUST reflect the current value
- AND rapid calls MUST cancel previous debounce timers

#### Scenario: Sort cycling

- WHEN `toggleSort('value')` is called once
- THEN `sortKey` MUST be `'value'` and `sortOrder` MUST be `'asc'`
- AND calling again MUST cycle to `'desc'`
- AND calling again MUST cycle to `null` (unsorted)

#### Scenario: Pagination

- WHEN `goToPage(3)` is called
- THEN `currentPage` MUST be 3
- AND a fetch MUST be triggered

#### Scenario: Filter management

- WHEN `setFilter('status', 'active')` is called
- THEN `filters.status` MUST be `'active'`
- AND a fetch MUST be triggered
- AND `currentPage` MUST reset to 1

### REQ-CO-002: useDetailView — Detail View State Management

The composable MUST manage loading, editing, saving, and deleting state.

#### Scenario: Load object

- GIVEN `useDetailView({ objectType: 'lead', fetchFn, saveFn, deleteFn })`
- WHEN `load('123')` is called
- THEN `loading` MUST be true during fetch
- AND `objectData` MUST contain the fetched object

#### Scenario: Save object

- WHEN `save({ id: '123', title: 'Updated' })` is called
- THEN `saving` MUST be true during save
- AND `onSaved` callback MUST fire after success

#### Scenario: Delete object

- WHEN `executeDelete('123')` is called
- THEN the object MUST be deleted via `deleteFn`
- AND `onDeleted` callback MUST fire

### REQ-CO-003: useSubResource — Sub-Resource CRUD

The composable MUST manage CRUD for sub-resources (files, relations, audit trails) within a parent object.

#### Scenario: Load sub-resources

- GIVEN `useSubResource({ parentType: 'lead', parentId: '123', resourceType: 'files' })`
- WHEN `load()` is called
- THEN `items` MUST contain the fetched sub-resources

#### Scenario: Create sub-resource

- WHEN `create({ name: 'report.pdf' })` is called
- THEN `creating` MUST be true during the operation
- AND the new item MUST appear in `items` after success

---

### Current Implementation Status

**Already implemented:**

- **REQ-CO-001 (useListView):** Fully implemented in `src/composables/useListView.js` (471 lines). Has two APIs:
  - **New API** (`useListView('objectType', options)`) — Integrates directly with `useObjectStore`. Returns `schema`, `objects`, `loading`, `pagination`, `searchTerm`, `sortKey`, `sortOrder`, `activeFilters`, `visibleColumns`, `pageSize`, `onSearch`, `onSort`, `onFilterChange`, `onPageChange`, `onPageSizeChange`, `refresh`. Includes URL sync/deeplink support (bi-directional sync with query params), sidebar wiring via `sidebarState`, and schema retry-fetch on mount.
  - **Legacy API** (`useListView({ objectType, fetchFn, ... })`) — Returns `searchTerm`, `filters`, `sortKey`, `sortOrder`, `currentPage`, `pageSize`, `onSearchInput`, `toggleSort`, `setFilter`, `clearAllFilters`, `goToPage`, `fetch`, `buildFetchParams`.
  - Search debounce: implemented (default 300ms, configurable)
  - Sort cycling: legacy API cycles asc->desc->null; new API receives `{ key, order }` from CnDataTable directly
  - Pagination: `onPageChange(page)` triggers `refresh(page)`
  - Filter management: `onFilterChange(key, values)` resets to page 1

- **REQ-CO-002 (useDetailView):** Fully implemented in `src/composables/useDetailView.js` (289 lines). Has two APIs:
  - **New API** (`useDetailView('objectType', id, options)`) — Integrates with `useObjectStore`. Returns `object`, `loading`, `isNew`, `editing`, `saving`, `showDeleteDialog`, `error`, `validationErrors`, `onSave`, `confirmDelete`. Supports router navigation after create/delete, 422 validation error handling, and auto-fetch on mount/id-change.
  - **Legacy API** (`useDetailView({ objectType, fetchFn, saveFn, deleteFn, ... })`) — Returns `objectData`, `editing`, `loading`, `saving`, `showDeleteDialog`, `error`, `load`, `save`, `confirmDelete`, `executeDelete`.

- **REQ-CO-003 (useSubResource):** Fully implemented in `src/composables/useSubResource.js` (142 lines). Returns `data` (reactive with `results`, `total`, `page`, `pages`, `limit`, `offset`), `loading`, `error`, `fetch(type, objectId, params)`, `clear()`. Supports `transform` option for normalizing results (e.g., CalDAV tasks). Uses standalone fetch (not Pinia store).

- **Additional composable not in spec:** `useDashboardView` in `src/composables/useDashboardView.js` (240 lines) — Dashboard state management with NC widget loading, layout persistence, add/remove widgets.

**All composables are exported via `src/composables/index.js` and `src/index.js`.**

**Not yet implemented / deviations from spec:**
- The spec's scenario for `useListView` references `onSearchInput` and `toggleSort` — these are legacy API methods. The new API uses `onSearch` and `onSort` instead.
- The spec references `setFilter(key, value)` — the new API uses `onFilterChange(key, values)` where values is an array.
- The spec references `goToPage(page)` — the new API uses `onPageChange(page)`.
- The spec's `useDetailView` scenario references `load(id)` — the new API auto-fetches on mount and on id change; explicit `load` is only in the legacy API.
- The spec's `useSubResource` scenario references `create()` — the actual implementation only has `fetch()` and `clear()`. There is no `create`, `creating` ref, or auto-append behavior. Create operations go through the parent object store.
- The spec does not mention URL sync/deeplink support in `useListView`.
- The spec does not mention `useDashboardView`.

### Standards & References

- **Vue Composition API (via `vue` compatibility):** Composables use `ref`, `computed`, `watch`, `onMounted`, `onBeforeUnmount` from Vue 2's Composition API bridge
- **Pinia integration:** `useListView` and `useDetailView` new APIs call `useObjectStore()` internally
- **Backward compatibility:** Both composables maintain dual API (string-based new API + object-based legacy API) detected at runtime

### Specificity Assessment

- **Specific enough?** Partially. The legacy API scenarios match well, but the new API diverges in method names and signatures.
- **Missing/ambiguous:**
  - The spec does not document the new API at all (string-based `useListView('objectType')`) — only the legacy options-object API
  - `useSubResource.create()` is specified but not implemented — the spec assumes create/update operations, but the composable is read-only
  - No mention of URL sync, sidebar wiring, or schema retry in `useListView`
  - No mention of 422 validation error handling in `useDetailView`
  - `useDashboardView` is entirely missing from this spec
- **Open questions:**
  - Should `useSubResource` support `create`/`update`/`delete` operations as the spec implies, or remain read-only?
  - Should the spec be updated to document both the new and legacy APIs?
  - Should `useDashboardView` be added to this spec or kept in a separate dashboard spec?
