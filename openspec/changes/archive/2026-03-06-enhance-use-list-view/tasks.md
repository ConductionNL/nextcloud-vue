# Tasks: enhance-use-list-view

## 1. Enhance useListView composable (nextcloud-vue)

### Task 1.1: Add objectType param and objectStore integration
- **spec_ref**: `specs/use-list-view/spec.md#requirement-objectstore-integration`
- **files**: `nextcloud-vue/src/composables/useListView.js`
- **acceptance_criteria**:
  - GIVEN `useListView('client')` is called WHEN `objectStore.collections.client` changes THEN `objects` ref updates reactively
  - GIVEN `useListView()` with no args WHEN called THEN no error is thrown (backward compat)
- [x] 1.1 Extend `useListView(objectType?, options?)` — add `objectType` param, call `useObjectStore()` internally, return reactive `objects`, `loading`, `pagination` computed refs derived from the store

### Task 1.2: Schema loading on mount
- **spec_ref**: `specs/use-list-view/spec.md#requirement-schema-loading-on-mount`
- **files**: `nextcloud-vue/src/composables/useListView.js`
- **acceptance_criteria**:
  - GIVEN `useListView('client')` WHEN component mounts THEN `objectStore.fetchSchema('client')` is called and result stored in `schema` ref
- [x] 1.2 Add `schema` ref (initially `null`); call `objectStore.fetchSchema(objectType)` in `onMounted`; expose `schema` in return value

### Task 1.3: Fetch with params (refresh function)
- **spec_ref**: `specs/use-list-view/spec.md#requirement-fetch-with-params`
- **files**: `nextcloud-vue/src/composables/useListView.js`
- **acceptance_criteria**:
  - GIVEN search/sort/filter/page state WHEN `refresh()` is called THEN correct params are passed to `objectStore.fetchCollection`
  - GIVEN `activeFilters` has empty arrays WHEN `refresh()` is called THEN empty-array keys are omitted from params
  - GIVEN single-value filter `{ type: ['org'] }` WHEN `refresh()` is called THEN param is scalar `type: 'org'`
- [x] 1.3 Implement `buildParams(page)` inside the composable; implement `refresh(page = 1)` that calls `objectStore.fetchCollection(objectType, buildParams(page))`

### Task 1.4: Event handlers wired to refresh
- **spec_ref**: `specs/use-list-view/spec.md#requirement-event-handlers`
- **files**: `nextcloud-vue/src/composables/useListView.js`
- **acceptance_criteria**:
  - GIVEN `onSearch('acme')` WHEN 300 ms passes THEN `refresh(1)` is called exactly once
  - GIVEN `onSort({ key: 'name', order: 'asc' })` THEN `sortKey`, `sortOrder` update and `refresh(1)` is called
  - GIVEN `onFilterChange('type', ['person'])` THEN `activeFilters` updates and `refresh(1)` is called
  - GIVEN `onFilterChange('type', [])` THEN `type` key is removed from `activeFilters`
- [x] 1.4 Replace existing `onSearchInput`/`toggleSort`/`setFilter` with new `onSearch` (debounced), `onSort`, `onFilterChange`, `onPageChange`, `onPageSizeChange` — all call `refresh` after updating state

### Task 1.5: Sidebar wiring (setup/teardown)
- **spec_ref**: `specs/use-list-view/spec.md#requirement-sidebar-wiring`
- **files**: `nextcloud-vue/src/composables/useListView.js`
- **acceptance_criteria**:
  - GIVEN `options.sidebarState` provided WHEN component mounts THEN `sidebarState.active = true`, schema, and callbacks are set
  - GIVEN component is destroyed THEN `sidebarState.active = false` and all callbacks are `null`
  - GIVEN `refresh()` completes THEN `sidebarState.facetData` is updated from `objectStore.facets[objectType]`
  - GIVEN sidebar fires `onColumnsChange` THEN `visibleColumns.value` is updated
- [x] 1.5 In `onMounted` (when `options.sidebarState` is set): wire `sidebarState.active`, `schema`, search/columns/filter callbacks. In `onBeforeUnmount`: clear all. Watch `objectStore.facets[objectType]` to push `facetData`.

---

## 2. Enhance useDetailView composable (nextcloud-vue)

### Task 2.1: Add objectType + id params and objectStore integration
- **spec_ref**: `specs/use-detail-view/spec.md#requirement-objectstore-integration`
- **files**: `nextcloud-vue/src/composables/useDetailView.js`
- **acceptance_criteria**:
  - GIVEN `useDetailView('client', '123')` WHEN store has the object THEN `object` computed ref returns it
  - GIVEN `id` is `'new'` THEN `object.value` is `{}` and `isNew.value` is `true`
  - GIVEN no args WHEN called THEN no error (backward compat)
- [x] 2.1 Extend `useDetailView(objectType?, id?, options?)` — derive `object` from `objectStore.getObject(objectType, id)`; add `isNew` computed ref

### Task 2.2: Fetch on mount and watch id
- **spec_ref**: `specs/use-detail-view/spec.md#requirement-fetch-on-mount`
- **files**: `nextcloud-vue/src/composables/useDetailView.js`
- **acceptance_criteria**:
  - GIVEN `id` is `'123'` WHEN component mounts THEN `objectStore.fetchObject('client', '123')` is called
  - GIVEN `id` is `'new'` WHEN component mounts THEN `fetchObject` is NOT called
  - GIVEN `id` ref changes from `'123'` to `'456'` THEN `fetchObject('client', '456')` is called
- [x] 2.2 In `onMounted`: call `fetchObject` when `!isNew`. Add `watch(idRef, ...)` to re-fetch on id change.

### Task 2.3: Save operation with redirect and validation error handling
- **spec_ref**: `specs/use-detail-view/spec.md#requirement-save-operation`
- **files**: `nextcloud-vue/src/composables/useDetailView.js`
- **acceptance_criteria**:
  - GIVEN `isNew` is `true` and `detailRouteName` set WHEN `onSave` succeeds THEN router navigates to detail with new id
  - GIVEN `isNew` is `false` WHEN `onSave` succeeds THEN `editing.value = false` and `fetchObject` is called
  - GIVEN API returns 422 WHEN `onSave` called THEN `validationErrors.value` is set; no redirect
  - GIVEN save is in flight THEN `saving.value` is `true`
- [x] 2.3 Implement `onSave(formData)` in the composable; handle create-vs-update branches; catch 422 for `validationErrors`; manage `saving` ref

### Task 2.4: Delete operation with redirect
- **spec_ref**: `specs/use-detail-view/spec.md#requirement-delete-operation`
- **files**: `nextcloud-vue/src/composables/useDetailView.js`
- **acceptance_criteria**:
  - GIVEN `listRouteName` set WHEN `confirmDelete()` succeeds THEN router navigates to list
  - GIVEN delete fails THEN `error.value` is set; no navigation
- [x] 2.4 Implement `confirmDelete()` in the composable; call `objectStore.deleteObject`; navigate on success; set `error` on failure

---

## 3. Update composable exports and docs (nextcloud-vue)

### Task 3.1: Update composables/index.js exports
- **files**: `nextcloud-vue/src/composables/index.js`, `nextcloud-vue/src/index.js`
- **acceptance_criteria**:
  - GIVEN the library is imported THEN `useListView` and `useDetailView` are available from `@conduction/nextcloud-vue`
- [x] 3.1 Verify both composables are exported from `src/composables/index.js` and re-exported from `src/index.js` (no changes needed if already present — confirm only)

### Task 3.2: Update composables documentation
- **files**: `nextcloud-vue/docs/utilities/composables/index.md`
- **acceptance_criteria**:
  - GIVEN the docs site is built THEN `useListView` and `useDetailView` sections show the new API with options, return values, and a before/after example
- [x] 3.2 Rewrite `useListView` and `useDetailView` sections to show the new signature, options table, return-value table, and a concise before/after code example

---

## 4. Migrate pipelinq list views

### Task 4.1: Migrate ClientList.vue
- **files**: `pipelinq/src/views/clients/ClientList.vue`
- **acceptance_criteria**:
  - GIVEN the migrated component THEN it renders the same CnIndexPage with schema, objects, loading, pagination bound; sidebar works; search/sort/filter/pagination work
  - GIVEN the component THEN it contains no `setupSidebar`, `teardownSidebar`, or manual `fetchCollection` calls
- [x] 4.1 Replace data/computed/methods boilerplate with `useListView('client', { sidebarState })` in `setup()`; keep only `openClient` and `createNew` router methods

### Task 4.2: Migrate remaining pipelinq list views
- **files**: `pipelinq/src/views/leads/LeadList.vue`, `pipelinq/src/views/contacts/ContactList.vue` (and any others)
- **acceptance_criteria**:
  - GIVEN each migrated view THEN same criteria as 4.1 apply per entity
- [x] 4.2 Apply the same migration pattern to all remaining pipelinq list views

---

## 5. Migrate procest list views

### Task 5.1: Migrate RequestList.vue
- **files**: `procest/src/views/requests/RequestList.vue`
- **acceptance_criteria**:
  - GIVEN the migrated component THEN it renders correctly with sidebar, search, sort, filter, pagination all functional
- [x] 5.1 Migrate RequestList.vue to use `useListView('request', { sidebarState })`

### Task 5.2: Migrate remaining procest list views
- **files**: `procest/src/views/cases/CaseList.vue`, `procest/src/views/tasks/TaskList.vue` (and any others)
- **acceptance_criteria**:
  - GIVEN each migrated view THEN same criteria as 5.1 per entity
- [x] 5.2 Apply the same migration pattern to all remaining procest list views

---

## Verification

- [x] `npm run lint` passes in nextcloud-vue
- [x] `npm run lint` passes in pipelinq and procest after migration
- [x] `npm run build` succeeds in all three projects
- [x] Manual test: list view loads, search works, sidebar filters update results, sorting works, pagination works
- [x] Manual test: creating a new object via the form and saving redirects correctly (useDetailView)
- [x] Manual test: deleting an object navigates back to the list (useDetailView)
- [x] No `setupSidebar` / `teardownSidebar` / manual `fetchCollection` remains in migrated files
