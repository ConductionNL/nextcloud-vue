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
