---
status: reviewed
---

# Store — Spec

**OpenSpec changes**: add-live-updates-plugin (in-progress — adds notify_push subscription transport)

## Purpose

Specifies the Pinia object store (`useObjectStore`), factory function (`createObjectStore`), sub-resource plugin factory (`createSubResourcePlugin`), built-in plugins, and all supporting utilities for OpenRegister CRUD operations. This store is the single data layer shared by all Conduction Nextcloud apps (OpenRegister, Pipelinq, Procest, OpenCatalogi, MyDash).

**Files**: `src/store/useObjectStore.js`, `src/store/createSubResourcePlugin.js`, `src/store/plugins/`, `src/store/index.js`

**Exports** (from `src/store/index.js`):
- `useObjectStore` — default store instance (ID: `conduction-objects`)
- `createObjectStore(storeId, options)` — factory for custom store instances
- `createSubResourcePlugin(name, endpoint, options)` — factory for building custom plugins
- `emptyPaginated(limit)` — empty paginated response shape
- `auditTrailsPlugin`, `relationsPlugin`, `filesPlugin`, `lifecyclePlugin`, `selectionPlugin`, `searchPlugin` — built-in plugins
- `SEARCH_TYPE`, `getRegisterApiUrl`, `getSchemaApiUrl` — search helpers

**Cross-references**: `composables` (useListView consumes store state), `index-page` (CnIndexPage drives store actions)

---
## Requirements
### Requirement: REQ-ST-001 — Object Type Registration

The existing `registerObjectType(slug, schemaUuid, registerUuid)` signature MUST be extended to accept an optional fourth argument carrying the canonical OR slugs:

```js
store.registerObjectType('melding', schemaUuid, registerUuid, { registerSlug: 'zaken', schemaSlug: 'meldingen' })
```

When the optional argument is omitted, behaviour MUST be backwards-compatible with the existing signature — slug fields default to `null` in `objectTypeRegistry[slug]` and the live-updates plugin lazy-fetches them on first `subscribe()` call (see REQ-ST-LU-002 and REQ-ST-LU-009 below).

#### Scenario: Register with slugs

- GIVEN a store and OR slugs known at registration time
- WHEN `store.registerObjectType('melding', 'schema-uuid', 'register-uuid', { registerSlug: 'zaken', schemaSlug: 'meldingen' })` is called
- THEN `store.objectTypeRegistry.melding` MUST contain `{ schema: 'schema-uuid', register: 'register-uuid', registerSlug: 'zaken', schemaSlug: 'meldingen' }`
- AND collection-event subscription via `store.subscribe('melding')` MUST NOT trigger a slug lookup (slugs already cached)

#### Scenario: Register without slugs (back-compat)

- GIVEN existing consumer code calls `store.registerObjectType('melding', 'schema-uuid', 'register-uuid')` (three-arg form)
- THEN `store.objectTypeRegistry.melding` MUST contain `{ schema: 'schema-uuid', register: 'register-uuid', registerSlug: null, schemaSlug: null }`
- AND no error MUST be thrown
- AND existing consumer apps MUST continue to function without modification

---

### Requirement: REQ-ST-002 — Fetch Collection (List)

The store MUST fetch paginated collections from the OpenRegister API, parse pagination metadata, and store results reactively.

#### Scenario: Basic collection fetch

- GIVEN `'lead'` is registered with schema `'s1'` and register `'r1'`
- WHEN `store.fetchCollection('lead', { _page: 2, _limit: 10 })` is called
- THEN it MUST GET `{baseUrl}/r1/s1?_page=2&_limit=10` with headers from `buildHeaders()`
- AND `store.loading.lead` MUST be `true` during the request
- AND on success, `store.collections.lead` MUST contain the `data.results` array (or `data` if no `.results`)
- AND `store.pagination.lead` MUST be `{ total: data.total, page: data.page, pages: data.pages, limit: 10 }`
- AND `store.loading.lead` MUST be `false` after completion

#### Scenario: Auto-include facets when schema has facetable properties

- GIVEN the cached schema for `'lead'` has `properties.status.facetable = true`
- WHEN `store.fetchCollection('lead', {})` is called without explicit `_facets`
- THEN the request MUST include `_facets=extend` in the query string
- AND facet data from the response MUST be parsed into `store.facets.lead` in CnIndexSidebar format: `{ fieldName: { values: [{ value, count }] } }`

#### Scenario: Facet data parsing with buckets

- GIVEN the API returns `{ facets: { status: { buckets: [{ key: 'open', count: 5 }, { key: 'closed', count: 3 }] } } }`
- THEN `store.facets.lead` MUST equal `{ status: { values: [{ value: 'open', count: 5 }, { value: 'closed', count: 3 }] } }`

#### Scenario: Collection fetch with search term

- GIVEN `store.searchTerms.lead` is set
- WHEN `store.fetchCollection('lead', { _search: 'gemeente' })` is called
- THEN the API request MUST include `_search=gemeente` as a query parameter

#### Scenario: Collection fetch error

- GIVEN the API returns a 500 response
- WHEN `store.fetchCollection('lead')` completes
- THEN `store.errors.lead` MUST contain a parsed `ApiError` from `parseResponseError()`
- AND `store.collections.lead` MUST remain unchanged (action returns `[]`)
- AND `store.loading.lead` MUST be `false`

---

### Requirement: REQ-ST-003 — Fetch Single Object

The store MUST fetch individual objects by ID and cache them in the `objects` map.

#### Scenario: Fetch and cache a single object

- GIVEN `'lead'` is registered
- WHEN `store.fetchObject('lead', 'uuid-abc')` is called
- THEN it MUST GET `{baseUrl}/r1/s1/uuid-abc`
- AND on success, `store.objects.lead['uuid-abc']` MUST contain the response data
- AND the action MUST return the fetched object

#### Scenario: Fetch object updates existing cache entry

- GIVEN `store.objects.lead['uuid-abc']` already has a cached version
- WHEN `store.fetchObject('lead', 'uuid-abc')` returns a newer version
- THEN the cache entry MUST be replaced with the new data
- AND other cached objects under `store.objects.lead` MUST be preserved

#### Scenario: Fetch object network failure

- GIVEN a `TypeError` is thrown (network unreachable)
- WHEN `store.fetchObject('lead', 'uuid-abc')` catches the error
- THEN `store.errors.lead` MUST contain a network error from `networkError(error)` with `status: 0`
- AND the action MUST return `null`

---

### Requirement: REQ-ST-004 — Save Object (Create and Update)

The store MUST create new objects via POST and update existing objects via PUT, branching on the presence of an `id` field.

#### Scenario: Create a new object (no id)

- GIVEN `'lead'` is registered
- WHEN `store.saveObject('lead', { title: 'New Lead', status: 'open' })` is called without an `id` field
- THEN it MUST POST to `{baseUrl}/r1/s1` with the object as JSON body
- AND on success, the returned object MUST be cached in `store.objects.lead[data.id]`
- AND the action MUST return the created object with server-assigned `id`

#### Scenario: Update an existing object (has id)

- GIVEN an object with `id: 'uuid-abc'` exists
- WHEN `store.saveObject('lead', { id: 'uuid-abc', title: 'Updated Lead' })` is called
- THEN it MUST PUT to `{baseUrl}/r1/s1/uuid-abc`
- AND on success, the cache entry at `store.objects.lead['uuid-abc']` MUST be updated

#### Scenario: Save with validation error

- GIVEN the API returns 422 with `{ validationErrors: { title: ['required'] } }`
- WHEN `store.saveObject('lead', {})` completes
- THEN `store.errors.lead` MUST have `isValidation: true`, `fields: { title: ['required'] }`, and `status: 422`
- AND the action MUST return `null`

#### Scenario: Loading state during save

- WHEN `store.saveObject('lead', data)` is in progress
- THEN `store.isLoading('lead')` MUST return `true`
- AND after completion (success or failure) it MUST return `false`

---

### Requirement: REQ-ST-005 — Delete Object

The store MUST delete objects via the API and clean up both the object cache and collection arrays.

#### Scenario: Successful single delete

- GIVEN `store.objects.lead['uuid-abc']` exists and is in `store.collections.lead`
- WHEN `store.deleteObject('lead', 'uuid-abc')` is called
- THEN it MUST DELETE `{baseUrl}/r1/s1/uuid-abc`
- AND on success, `store.objects.lead['uuid-abc']` MUST be removed
- AND `store.collections.lead` MUST be filtered to exclude objects with `id === 'uuid-abc'`
- AND the action MUST return `true`

#### Scenario: Delete failure preserves state

- GIVEN the API returns 403
- WHEN `store.deleteObject('lead', 'uuid-abc')` completes
- THEN `store.objects.lead['uuid-abc']` MUST still exist
- AND `store.errors.lead` MUST contain the parsed error
- AND the action MUST return `false`

#### Scenario: Batch delete with partial success

- GIVEN IDs `['a', 'b', 'c']` where `'b'` fails to delete
- WHEN `store.deleteObjects('lead', ['a', 'b', 'c'])` is called
- THEN all three DELETE requests MUST run in parallel via `Promise.all`
- AND the result MUST be `{ successfulIds: ['a', 'c'], failedIds: ['b'] }`
- AND objects `'a'` and `'c'` MUST be removed from cache and collections
- AND object `'b'` MUST remain in cache and collections
- AND `store.errors.lead` MUST contain a generic error mentioning `1 item(s)` failed

#### Scenario: Batch delete with empty array

- WHEN `store.deleteObjects('lead', [])` is called
- THEN it MUST return `{ successfulIds: [], failedIds: [] }` immediately without API calls

---

### Requirement: REQ-ST-006 — Search State Management

The store MUST manage per-type search terms with explicit set/clear actions.

#### Scenario: Set search term

- WHEN `store.setSearchTerm('lead', 'gemeente')` is called
- THEN `store.searchTerms.lead` MUST equal `'gemeente'`
- AND `store.getSearchTerm('lead')` MUST return `'gemeente'`

#### Scenario: Clear search term

- GIVEN `store.searchTerms.lead` is `'gemeente'`
- WHEN `store.clearSearchTerm('lead')` is called
- THEN `store.searchTerms.lead` MUST equal `''`

#### Scenario: Search term isolation between types

- GIVEN `store.setSearchTerm('lead', 'foo')` and `store.setSearchTerm('case', 'bar')`
- THEN `store.getSearchTerm('lead')` MUST return `'foo'`
- AND `store.getSearchTerm('case')` MUST return `'bar'`

---

### Requirement: REQ-ST-007 — Schema and Register Caching

The store MUST fetch and cache schema/register definitions, returning cached versions on subsequent calls.

#### Scenario: First schema fetch

- GIVEN `'lead'` is registered with schema ID `'s1'`
- WHEN `store.fetchSchema('lead')` is called for the first time
- THEN it MUST GET `/apps/openregister/api/schemas/s1`
- AND on success, `store.schemas.lead` MUST contain the schema object
- AND the action MUST return the schema

#### Scenario: Cached schema return

- GIVEN `store.schemas.lead` is already populated
- WHEN `store.fetchSchema('lead')` is called again
- THEN it MUST return the cached schema immediately without making an API call

#### Scenario: First register fetch

- GIVEN `'lead'` is registered with register ID `'r1'`
- WHEN `store.fetchRegister('lead')` is called for the first time
- THEN it MUST GET `/apps/openregister/api/registers/r1`
- AND on success, `store.registers.lead` MUST contain the register object

#### Scenario: Schema fetch failure

- GIVEN the schema API returns a non-OK response
- WHEN `store.fetchSchema('lead')` completes
- THEN it MUST return `null` without setting an error in `store.errors`

---

### Requirement: REQ-ST-008 — Batch Reference Resolution

The store MUST resolve arrays of object references by ID, using the cache first and only fetching uncached objects.

#### Scenario: All references cached

- GIVEN `store.objects.lead` contains objects for IDs `['a', 'b']`
- WHEN `store.resolveReferences('lead', ['a', 'b'])` is called
- THEN it MUST return `{ a: {...}, b: {...} }` without making any API calls

#### Scenario: Mixed cached and uncached references

- GIVEN `store.objects.lead` contains `'a'` but NOT `'b'`
- WHEN `store.resolveReferences('lead', ['a', 'b'])` is called
- THEN it MUST fetch only `'b'` from the API
- AND cache `'b'` in `store.objects.lead`
- AND return `{ a: {...}, b: {...} }`

#### Scenario: Duplicate and falsy IDs are filtered

- WHEN `store.resolveReferences('lead', ['a', 'a', null, undefined, ''])` is called
- THEN it MUST deduplicate to `['a']` and skip falsy values
- AND return at most one entry for `'a'`

#### Scenario: Non-blocking fetch failures

- GIVEN `'c'` returns a 404 from the API
- WHEN `store.resolveReferences('lead', ['c'])` is called
- THEN `'c'` MUST NOT appear in the returned map
- AND no error MUST be set in `store.errors`

---

### Requirement: REQ-ST-009 — Error Handling

The store MUST provide structured error objects via `parseResponseError()`, `networkError()`, and `genericError()`, and support manual error clearing.

#### Scenario: HTTP error produces ApiError shape

- GIVEN an API call returns a 403 response
- WHEN the store processes the error
- THEN `store.errors[type]` MUST be an object with shape `{ status: 403, message: string, details: any, isValidation: false, fields: null, toString() }`

#### Scenario: Validation error (400/422)

- GIVEN an API call returns 422 with body `{ validationErrors: { email: ['invalid format'] } }`
- THEN the ApiError MUST have `isValidation: true`, `fields: { email: ['invalid format'] }`, and `status: 422`

#### Scenario: Network error (TypeError)

- GIVEN a `fetch()` throws a `TypeError` (e.g. DNS failure)
- THEN the error MUST have `status: 0` and `isValidation: false`

#### Scenario: Clear error manually

- GIVEN `store.errors.lead` contains an error
- WHEN `store.clearError('lead')` is called
- THEN `store.errors.lead` MUST be `null`

#### Scenario: Loading always false after error

- GIVEN any action throws or receives a non-OK response
- THEN `store.loading[type]` MUST be set to `false` in the `finally` block

---

### Requirement: REQ-ST-010 — Store Factory (`createObjectStore`)

The factory function MUST create independent Pinia store instances with custom IDs and optional plugin composition.

#### Scenario: Basic factory usage

- WHEN `const useMyStore = createObjectStore('my-app')` is called
- THEN `useMyStore` MUST be a Pinia store composable with ID `'my-app'`
- AND `useMyStore()` MUST return a store with all base state, getters, and actions

#### Scenario: Independent store instances

- GIVEN `const useStoreA = createObjectStore('store-a')` and `const useStoreB = createObjectStore('store-b')`
- WHEN `storeA.registerObjectType('lead', ...)` is called
- THEN `storeB.objectTypes` MUST NOT include `'lead'`

#### Scenario: Factory with plugins

- WHEN `createObjectStore('my-store', { plugins: [filesPlugin(), auditTrailsPlugin()] })` is called
- THEN the resulting store MUST include all base actions PLUS `fetchFiles`, `uploadFiles`, `deleteFile`, `publishFile`, `unpublishFile`, `fetchTags`, `fetchAuditTrails`, `clearFiles`, `clearAuditTrails`

#### Scenario: Factory with custom baseUrl

- WHEN `createObjectStore('my-store', { baseUrl: '/apps/myapp/api/objects' })` is called
- THEN all API calls MUST use `/apps/myapp/api/objects` as the URL prefix instead of the default

#### Scenario: Runtime configure override

- GIVEN a store created with the default base URL
- WHEN `store.configure({ baseUrl: '/apps/custom/api/objects' })` is called
- THEN subsequent API calls MUST use the new base URL

---

### Requirement: REQ-ST-011 — Plugin Architecture

The store MUST support plugins that contribute state, getters, and actions via `mergePluginState`, `mergePluginGetters`, and `mergePluginActions` at definition time.

#### Scenario: Plugin state merging

- GIVEN a plugin returns `{ state: () => ({ myData: [] }), getters: {}, actions: {} }`
- WHEN the store is created with this plugin
- THEN `store.myData` MUST be initialized to `[]`

#### Scenario: Plugin action naming convention

- GIVEN a plugin with `name: 'auditTrails'`
- THEN the store MUST expose `fetchAuditTrails()`, `clearAuditTrails()`, `getAuditTrails`, `isAuditTrailsLoading`, `getAuditTrailsError`

#### Scenario: Clear all sub-resources

- GIVEN plugins `filesPlugin` and `auditTrailsPlugin` are registered
- WHEN `store.clearAllSubResources()` is called
- THEN it MUST call `clearFiles()` and `clearAuditTrails()` by deriving the method name from each plugin's `name` property

#### Scenario: Plugin action name collision

- GIVEN two plugins both define an action named `doSomething`
- THEN the last plugin in the array MUST win (standard `Object.assign` behavior)

---

### Requirement: REQ-ST-012 — Sub-Resource Plugin Factory (`createSubResourcePlugin`)

The factory MUST generate read-only sub-resource plugins with standardized state, getters, and actions from a name and endpoint.

#### Scenario: Create a custom sub-resource plugin

- WHEN `const notesPlugin = createSubResourcePlugin('notes', 'notes', { limit: 50 })` is called
- THEN `notesPlugin()` MUST return a plugin definition with:
  - State: `notes` (emptyPaginated with limit 50), `notesLoading` (false), `notesError` (null)
  - Getters: `getNotes`, `isNotesLoading`, `getNotesError`
  - Actions: `fetchNotes(type, objectId, params)`, `clearNotes()`

#### Scenario: Sub-resource fetch URL construction

- GIVEN the store has base URL `/apps/openregister/api/objects` and type `'case'` with register `'r1'` and schema `'s1'`
- WHEN `store.fetchNotes('case', 'obj-123', { _page: 2 })` is called
- THEN it MUST GET `/apps/openregister/api/objects/r1/s1/obj-123/notes?_page=2`

#### Scenario: Sub-resource fetch stores paginated results

- GIVEN the API returns `{ results: [...], total: 42, page: 1, pages: 3 }`
- THEN `store.notes` MUST equal `{ results: [...], total: 42, page: 1, pages: 3, limit: 50, offset: 0 }`

#### Scenario: emptyPaginated helper

- WHEN `emptyPaginated(25)` is called
- THEN it MUST return `{ results: [], total: 0, page: 1, pages: 0, limit: 25, offset: 0 }`

---

### Requirement: REQ-ST-013 — Built-In Plugins

The store MUST ship the following built-in plugins, each with specific state, actions, and getters.

#### Scenario: filesPlugin — upload, publish, unpublish, delete, tags

- GIVEN `filesPlugin()` is registered
- THEN the store MUST expose: `fetchFiles(type, objectId, params)`, `uploadFiles(type, objectId, formData)`, `publishFile(type, objectId, fileId)`, `unpublishFile(type, objectId, fileId)`, `deleteFile(type, objectId, fileId)`, `fetchTags()`, `clearFiles()`
- AND state: `files` (paginated), `filesLoading`, `filesError`, `tags` (array), `tagsLoading`, `tagsError`
- AND getters: `getFiles`, `isFilesLoading`, `getFilesError`, `getTags`, `isTagsLoading`, `getTagsError`
- AND `uploadFiles` MUST POST to `{objectUrl}/filesMultipart` with `FormData` body and null Content-Type header
- AND after upload/publish/unpublish/delete, `fetchFiles` MUST be called to refresh the list

#### Scenario: relationsPlugin — contracts, uses, used

- GIVEN `relationsPlugin()` is registered
- THEN the store MUST expose three sub-resources: `fetchContracts`, `fetchUses`, `fetchUsed` (and their clear/get/isLoading counterparts)
- AND `clearRelations()` MUST call `clearContracts()`, `clearUses()`, `clearUsed()`

#### Scenario: auditTrailsPlugin — read-only audit log

- GIVEN `auditTrailsPlugin()` is registered
- THEN the store MUST expose `fetchAuditTrails(type, objectId, params)` and `clearAuditTrails()`
- AND the endpoint MUST be `audit-trails`

#### Scenario: lifecyclePlugin — lock, unlock, publish, depublish, revert, merge

- GIVEN `lifecyclePlugin()` is registered
- THEN the store MUST expose: `lockObject(type, objectId, options)`, `unlockObject(type, objectId)`, `publishObject(type, objectId, options)`, `depublishObject(type, objectId, options)`, `revertObject(type, objectId, options)`, `mergeObjects(type, sourceId, options)`
- AND each action MUST POST to `{objectUrl}/{action}` (e.g. `/lock`, `/publish`)
- AND on success, if the response includes an `id`, the object cache MUST be updated
- AND state: `lifecycleLoading`, `lifecycleError`; getters: `isLifecycleLoading`, `getLifecycleError`

#### Scenario: selectionPlugin — multi-select management

- GIVEN `selectionPlugin()` is registered
- THEN the store MUST expose: `setSelectedObjects(ids)`, `clearSelectedObjects()`, `toggleSelectAllObjects(type)`
- AND state: `selectedObjects` (array of ID strings)
- AND getter: `isAllSelected(type)` MUST return `true` when every object in the collection is in `selectedObjects` (false for empty collections)
- AND `toggleSelectAllObjects(type)` MUST toggle between all-selected and none-selected, preserving selections from other types

#### Scenario: searchPlugin — cross-register search

- GIVEN `searchPlugin()` is registered
- THEN the store MUST expose: `setSearchParams(params)`, `updateSearchParams(params)`, `setSearchVisibleColumns(columns)`, `clearSearchCollection()`, `refetchSearchCollection()`
- AND state: `searchParams`, `searchVisibleColumns`, internal `_searchCollection`, `_searchPagination`, `_searchLoading`, `_searchSchema`, `_searchRegister`, `_searchFacets`, `_searchRequestId`
- AND getters: `searchCollection`, `searchPagination`, `searchLoading`, `searchSchema`, `searchRegister`, `searchFacets`
- AND `refetchSearchCollection` MUST auto-register the register/schema as an object type, fetch schema/register in parallel (non-blocking), handle race conditions via `_searchRequestId`, and flatten `filters` object into query params
- AND changing `register` or `schema` in `setSearchParams`/`updateSearchParams` MUST clear cached schema/register

#### Scenario: registerMappingPlugin — register/schema dropdowns

- GIVEN `registerMappingPlugin()` is registered
- THEN the store MUST expose: `fetchRegisters(withSchemas)`, `fetchSchemasForRegister(registerId)`, `schemaOptions(registerId)`, `clearRegisterMapping()`
- AND state: `registers`, `registerSchemas`, `registersLoading`, `registersError`
- AND getter: `registerOptions` MUST return `[{ label, value }]` for NcSelect
- AND `fetchRegisters(true)` MUST request `?_extend[]=schemas` and cache schemas by register ID

---

### Requirement: REQ-ST-014 — Reactive Getters

The store MUST provide getter functions for all state buckets that return safe defaults when data is missing.

#### Scenario: Getter defaults for unregistered type

- GIVEN `'unknown'` has NOT been registered
- THEN `store.getCollection('unknown')` MUST return `[]`
- AND `store.getObject('unknown', 'any')` MUST return `null`
- AND `store.getCachedObject('unknown', 'any')` MUST return `null`
- AND `store.isLoading('unknown')` MUST return `false`
- AND `store.getError('unknown')` MUST return `null`
- AND `store.getPagination('unknown')` MUST return `{ total: 0, page: 1, pages: 1, limit: 20 }`
- AND `store.getSearchTerm('unknown')` MUST return `''`
- AND `store.getSchema('unknown')` MUST return `null`
- AND `store.getRegister('unknown')` MUST return `null`
- AND `store.getFacets('unknown')` MUST return `{}`

#### Scenario: objectTypes lists registered slugs

- GIVEN types `'lead'` and `'case'` are registered
- THEN `store.objectTypes` MUST return `['lead', 'case']`

#### Scenario: getCachedObject is alias for getObject

- GIVEN `store.objects.lead['abc']` exists
- THEN `store.getCachedObject('lead', 'abc')` MUST return the same object as `store.getObject('lead', 'abc')`

---

### Requirement: REQ-ST-015 — Consumer App Integration Patterns

The store MUST support the standard consumer app pattern where each app creates a custom store instance via `createObjectStore` with selected plugins, re-exports it as `useObjectStore`, and uses it across all views.

#### Scenario: Pipelinq integration pattern

- GIVEN Pipelinq creates its store as:
  ```js
  import { createObjectStore, filesPlugin, auditTrailsPlugin, relationsPlugin, registerMappingPlugin } from '@conduction/nextcloud-vue'
  export const useObjectStore = createObjectStore('object', {
    plugins: [filesPlugin(), auditTrailsPlugin(), relationsPlugin(), registerMappingPlugin()],
  })
  ```
- THEN all Pipelinq views MUST be able to import `useObjectStore` from `'../store/modules/object.js'`
- AND call `store.registerObjectType(slug, schemaId, registerId)` for each entity (lead, product, request)
- AND use `store.fetchCollection`, `store.saveObject`, etc. with the registered slug

#### Scenario: OpenRegister integration with custom plugin

- GIVEN OpenRegister adds a custom `openregisterObjectPlugin` alongside all built-in plugins
- THEN the store MUST merge the custom plugin's state (`objectItem`, `filters`, `auditTrailItem`), getters (`currentType`, `activeSchema`), and actions (`refreshObjectList`, `setObjectItem`, `setFilters`)
- AND the custom plugin actions MUST be able to call base store actions (e.g. `this.fetchCollection`, `this.registerObjectType`)

#### Scenario: Multiple apps with same Pinia store ID

- GIVEN two apps both call `createObjectStore('object', ...)`
- THEN they MUST share the same Pinia store instance within the same Vue app (standard Pinia behavior)
- AND registered types from both apps MUST coexist in the same store

---

### Requirement: REQ-ST-LU-001 — `useLiveUpdates` singleton plugin

A single transport connection MUST exist per browser tab regardless of how many store instances or components call `store.subscribe()`. `getLiveUpdates()` is a module-level factory that returns the same instance on every call. The instance is constructed lazily on the first `subscribe()` call.

#### Scenario: Singleton across multiple store instances

- GIVEN `createObjectStore('store-a', { plugins: [liveUpdatesPlugin()] })` and `createObjectStore('store-b', { plugins: [liveUpdatesPlugin()] })` both return stores
- WHEN `storeA.subscribe('lead')` and `storeB.subscribe('case')` are both called
- THEN `getLiveUpdates()` MUST return the same object reference from both calls
- AND only one WebSocket connection to the Nextcloud push server MUST be established

#### Scenario: Lazy construction on first subscribe

- GIVEN no component has called `store.subscribe()` yet
- WHEN the store is initialized
- THEN no WebSocket connection MUST be opened
- AND `getLiveUpdates()` MUST return `null` until first subscribe or return the singleton lazily

#### Scenario: Status reflects connection lifecycle

- GIVEN a store with `liveUpdatesPlugin()` registered
- WHEN `store.subscribe('lead')` is called for the first time
- THEN `store.liveStatus` MUST transition from `'offline'` to `'connecting'` immediately
- AND upon successful WebSocket connection, MUST transition to `'live'`
- AND upon fallback activation, MUST transition to `'polling'`

#### Scenario: Plugin registration via createObjectStore

- WHEN `const useMyStore = createObjectStore('my-store', { plugins: [liveUpdatesPlugin()] })` is called
- THEN the resulting store MUST expose `subscribe`, `unsubscribe`, `liveStatus`, `liveSubscriptions`, `liveLastEventAt`
- AND calling `useObjectStore()` (the default store, without the plugin) MUST NOT expose those properties

---

### Requirement: REQ-ST-LU-002 — `store.subscribe(type, id?)` action

The store MUST expose a `subscribe(type, id?)` action that subscribes to live updates for an object type and optional ID. When `id` is provided, the subscription MUST target `or-object-{id}` (per-object events). When omitted, the subscription MUST target `or-collection-{registerSlug}-{schemaSlug}` derived from `objectTypeRegistry[type]`. The method MUST return an opaque handle that the caller passes to `unsubscribe()`. When called inside a Vue component lifecycle (setup or Options API `mounted`), `tryOnScopeDispose` MUST auto-register cleanup so the subscription is torn down when the component unmounts.

#### Scenario: Object subscription with ID

- GIVEN `'melding'` is registered with register slug `'zaken'` and schema slug `'meldingen'`
- WHEN `const handle = store.subscribe('melding', 'uuid-abc')` is called
- THEN the transport MUST subscribe to event key `'or-object-uuid-abc'`
- AND `handle` MUST be a non-null value usable in a subsequent `unsubscribe(handle)` call
- AND `store.liveSubscriptions` MUST increment by 1

#### Scenario: Collection subscription without ID

- GIVEN `'melding'` is registered with register `{ slug: 'zaken' }` and schema `{ slug: 'meldingen' }`
- WHEN `const handle = store.subscribe('melding')` is called
- THEN the transport MUST subscribe to event key `'or-collection-zaken-meldingen'`
- AND `store.liveSubscriptions` MUST increment by 1

#### Scenario: Auto-cleanup via scope dispose

- GIVEN `store.subscribe('melding', 'uuid-abc')` is called inside a Vue component `mounted()` hook (Options API)
- WHEN the component is destroyed (`beforeDestroy`)
- THEN the subscription MUST be cleaned up automatically via `tryOnScopeDispose`
- AND `store.liveSubscriptions` MUST decrement by 1

#### Scenario: Subscribe to unregistered type throws

- GIVEN `'unknown'` has NOT been registered via `registerObjectType`
- WHEN `store.subscribe('unknown')` is called
- THEN it MUST throw an `Error` with a message including `"unknown" is not registered`

---

### Requirement: REQ-ST-LU-003 — Refcounted listener fan-in

Multiple components subscribing to the same event key MUST share one underlying transport listener. The plugin MUST maintain an internal `Map<eventKey, Set<callback>>` that tracks all callbacks per key. When the last `unsubscribe()` for a key fires, the underlying transport listener for that key MUST be torn down. Other event keys MUST remain active.

#### Scenario: Multiple subscribers share one transport listener

- GIVEN three components each call `store.subscribe('melding', 'uuid-abc')` independently
- WHEN the transport receives `or-object-uuid-abc`
- THEN the transport MUST call the underlying notify_push `listen()` function exactly once for `'or-object-uuid-abc'`
- AND all three components' `fetchObject` triggers MUST fire (via the plugin's internal fan-out)

#### Scenario: Last unsubscribe tears down the key's listener

- GIVEN three components subscribed to the same event key via handles `h1`, `h2`, `h3`
- WHEN `store.unsubscribe(h1)` and `store.unsubscribe(h2)` are called
- THEN the transport listener for that key MUST remain active
- WHEN `store.unsubscribe(h3)` is called
- THEN the transport listener for that key MUST be removed
- AND other subscribed keys MUST remain unaffected

#### Scenario: Unrelated keys are independent

- GIVEN `store.subscribe('melding', 'uuid-a')` and `store.subscribe('melding', 'uuid-b')` are active
- WHEN `store.unsubscribe` removes the `uuid-a` subscription
- THEN the `or-object-uuid-b` listener MUST remain active and functional

---

### Requirement: REQ-ST-LU-004 — In-flight fetch deduplication

When multiple components subscribe to the same event key and an event fires, the store MUST issue exactly one HTTP fetch (one `fetchObject` or `fetchCollection` call). Concurrent callers for the same `(type, id)` object fetch or `(type, paramsHash)` collection fetch receive the same Promise. The dedup cache is cleared as soon as the Promise settles (resolve or reject).

#### Scenario: Five subscribers, one fetch on event burst

- GIVEN five components subscribe to `'or-object-uuid-abc'`
- WHEN the event `or-object-uuid-abc` fires once
- THEN `fetchObject('melding', 'uuid-abc')` MUST be called exactly once
- AND all five components MUST receive the updated data reactively via `store.objects.melding['uuid-abc']`

#### Scenario: Concurrent direct fetchObject calls are also deduplicated

- GIVEN no active subscription
- WHEN three application actions call `store.fetchObject('melding', 'uuid-abc')` simultaneously (within the same microtask burst)
- THEN exactly one HTTP GET request MUST be made
- AND all three callers MUST receive the same resolved value

#### Scenario: Dedup cache cleared on settle

- GIVEN a `fetchObject('melding', 'uuid-abc')` is in-flight
- WHEN the fetch resolves
- THEN the dedup cache entry for `'melding:uuid-abc'` MUST be removed
- AND a subsequent call to `fetchObject('melding', 'uuid-abc')` MUST issue a new HTTP request

#### Scenario: Failed fetch clears dedup entry

- GIVEN a `fetchObject('melding', 'uuid-abc')` is in-flight and the server returns 500
- WHEN the fetch rejects
- THEN the dedup cache entry MUST be removed
- AND subsequent calls MUST be able to retry

---

### Requirement: REQ-ST-LU-005 — Polling fallback transport

When `@nextcloud/notify_push` is unavailable (the `listen()` function returns `null` or the WebSocket connection fails after initial connect), `store.subscribe()` MUST silently route through a polling fallback. One coalesced `setInterval` per unique subscription key runs at a configurable interval (default 30s for collections, 60s for objects). Polling is suspended when `document.visibilityState === 'hidden'` and resumes on `visibilitychange`.

#### Scenario: Automatic fallback when notify_push unavailable

- GIVEN `@nextcloud/notify_push` returns `null` from `listen()`
- WHEN `store.subscribe('melding')` is called
- THEN `store.liveStatus` MUST equal `'polling'`
- AND `store.fetchCollection('melding', lastParams)` MUST be called on the configured interval
- AND no error or warning MUST appear in the console

#### Scenario: Polling pauses for hidden tabs

- GIVEN a collection subscription is active in polling mode
- WHEN `document.visibilityState` changes to `'hidden'`
- THEN polling MUST pause (no fetch calls while hidden)
- WHEN `document.visibilityState` changes to `'visible'`
- THEN polling MUST resume immediately (one fetch fires, then interval resets)

#### Scenario: Coalesced interval for multiple subscribers

- GIVEN five components subscribe to `'melding'` (no ID, same collection)
- WHEN in polling fallback mode
- THEN exactly one `setInterval` MUST run for that subscription key
- AND when all five unsubscribe, the interval MUST be cleared

#### Scenario: Configurable poll intervals

- GIVEN `liveUpdatesPlugin({ pollIntervalCollection: 15000, pollIntervalObject: 45000 })` is used
- WHEN a collection subscription is active in polling mode
- THEN `fetchCollection` MUST be called every 15 seconds
- WHEN an object subscription is active in polling mode
- THEN `fetchObject` MUST be called every 45 seconds

---

### Requirement: REQ-ST-LU-006 — Reconnect with jitter

When the notify_push WebSocket disconnects, the singleton MUST reconnect with exponential backoff plus jitter. On successful reconnect, every active subscription MUST re-attach to the socket. One round of refetches MUST be issued (each jittered 0–500ms independently) so reconnect cost is bounded.

#### Scenario: Exponential backoff on disconnect

- GIVEN the WebSocket disconnects after being `'live'`
- THEN `store.liveStatus` MUST transition to `'reconnecting'`
- AND the first reconnect attempt MUST wait approximately 1s (base) ± jitter
- AND if the second attempt also fails, the wait MUST be approximately 2s ± jitter
- AND subsequent attempts MUST cap at 30s

#### Scenario: All subscriptions re-attach on reconnect

- GIVEN 10 active subscriptions across different event keys
- WHEN the WebSocket reconnects successfully
- THEN all 10 event keys MUST be re-subscribed via `listen()` on the new connection
- AND `store.liveStatus` MUST return to `'live'`

#### Scenario: Refetch burst is jittered after reconnect

- GIVEN 20 active subscriptions when the WebSocket reconnects
- WHEN the reconnect succeeds
- THEN each subscription MUST trigger a refetch with an independent random delay in [0ms, 500ms]
- AND all 20 refetches MUST complete within 500ms + max HTTP latency
- AND dedup ensures at most one in-flight request per unique (type, id or params)

#### Scenario: Jitter formula

- GIVEN `backoff = min(base × 2^attempt, cap)` with `base=1000`, `cap=30000`, `multiplier=2`
- AND `delay = backoff + Math.random() × backoff`
- THEN after 5 failed attempts the delay MUST be in the range [16s, 32s] (cap applies at attempt 5)
- AND `delay` MUST never exceed 60s

---

### Requirement: REQ-ST-LU-007 — Refetch on event arrival

An incoming `or-object-{uuid}` event MUST trigger `store.fetchObject(type, id)` in the store that holds the subscription. An incoming `or-collection-{register}-{schema}` event MUST trigger `store.fetchCollection(type, lastParams)` where `lastParams` is the params object stashed by the most recent `fetchCollection(type, params)` call for that type. Refetch results land in the existing reactive `store.objects[type]` / `store.collections[type]` state so all Vue computed properties react automatically.

#### Scenario: Object event triggers fetchObject

- GIVEN `store.subscribe('melding', 'uuid-abc')` is active
- WHEN the transport receives `{ eventKey: 'or-object-uuid-abc', payload: { action: 'update', ... } }`
- THEN `store.fetchObject('melding', 'uuid-abc')` MUST be called
- AND the result MUST be stored in `store.objects.melding['uuid-abc']`
- AND `store.liveLastEventAt` MUST be updated to the current timestamp

#### Scenario: Collection event triggers fetchCollection with last params

- GIVEN `store.fetchCollection('melding', { _limit: 10, _search: 'gemeente' })` was called previously
- AND `store.subscribe('melding')` is active
- WHEN the transport receives `or-collection-zaken-meldingen`
- THEN `store.fetchCollection('melding', { _limit: 10, _search: 'gemeente' })` MUST be called (with stashed params)
- AND the result MUST land in `store.collections.melding`

#### Scenario: First collection event uses empty params when none stashed

- GIVEN `store.subscribe('melding')` is active but `fetchCollection` has not been called yet
- WHEN the transport receives `or-collection-zaken-meldingen`
- THEN `store.fetchCollection('melding', {})` MUST be called with an empty params object
- AND the result MUST land in `store.collections.melding`

#### Scenario: liveLastEventAt updates on each event

- GIVEN `store.subscribe('melding', 'uuid-abc')` is active
- WHEN three events arrive consecutively
- THEN `store.liveLastEventAt` MUST be a `Date` object with a timestamp close to `Date.now()` after each event

---

### Requirement: REQ-ST-LU-008 — Diagnostic state

The plugin MUST expose `store.liveStatus`, `store.liveSubscriptions`, and `store.liveLastEventAt` as reactive Pinia state accessible via getters. These properties MUST surface enough information for admin/debug UIs without exposing internal transport implementation details.

#### Scenario: liveStatus transitions

| From | To | Trigger |
|---|---|---|
| `'offline'` | `'connecting'` | First `subscribe()` call |
| `'connecting'` | `'live'` | WebSocket connected |
| `'connecting'` | `'polling'` | `listen()` returned `null` or connection timed out |
| `'live'` | `'reconnecting'` | WebSocket disconnected |
| `'reconnecting'` | `'live'` | WebSocket reconnected |
| `'reconnecting'` | `'polling'` | Reconnect attempts exhausted (after 5 consecutive failures) |

- GIVEN the store transitions through each lifecycle state
- THEN `store.liveStatus` MUST reflect the correct string at each step
- AND Vue computed properties depending on `store.liveStatus` MUST react without explicit watchers

#### Scenario: liveSubscriptions count

- GIVEN zero subscriptions active
- THEN `store.liveSubscriptions` MUST equal `0`
- WHEN `store.subscribe('melding', 'uuid-abc')` is called
- THEN `store.liveSubscriptions` MUST equal `1`
- WHEN a second `store.subscribe('melding', 'uuid-xyz')` is called
- THEN `store.liveSubscriptions` MUST equal `2`
- WHEN both are unsubscribed
- THEN `store.liveSubscriptions` MUST return to `0`

#### Scenario: Getters are read-only reactive projections

- GIVEN `store.liveStatus` is used in a Vue computed property
- WHEN the underlying Pinia state changes (e.g. WebSocket connects)
- THEN the computed property MUST recompute automatically without any explicit `watch`
- AND external code MUST NOT be able to set `store.liveStatus` directly (it is driven only by the transport singleton)

#### Scenario: Diagnostic state available on default store

- GIVEN `useObjectStore()` (the default store without the plugin)
- THEN accessing `store.liveStatus` MUST return `undefined` (not throw)
- AND apps that have not opted into `liveUpdatesPlugin` are completely unaffected

---

### Requirement: REQ-ST-LU-009 — Lazy slug resolution for collection subscriptions

When `store.subscribe(type)` is called for a collection (no `id` argument) and `objectTypeRegistry[type].registerSlug` or `schemaSlug` is `null`, the plugin MUST lazy-fetch the slugs via the existing `fetchRegister(registerUuid)` and `fetchSchema(schemaUuid)` actions before opening the transport subscription. Once resolved, slugs MUST be cached in `objectTypeRegistry[type]` so subsequent `subscribe()` calls for the same type are O(1).

If lazy fetch fails (network error, missing register/schema), `subscribe()` MUST reject with an error including the context — NOT silently subscribe to a malformed event key.

#### Scenario: Lazy slug resolution on first subscribe

- GIVEN `store.registerObjectType('melding', 'schema-uuid', 'register-uuid')` was called WITHOUT slugs
- AND `objectTypeRegistry.melding.registerSlug` is `null`
- WHEN `store.subscribe('melding')` is called
- THEN the plugin MUST call `store.fetchRegister('register-uuid')` and `store.fetchSchema('schema-uuid')` to obtain slugs
- AND on success, it MUST update `objectTypeRegistry.melding` with `{ registerSlug: 'zaken', schemaSlug: 'meldingen' }`
- AND it MUST then subscribe to event key `'or-collection-zaken-meldingen'`
- AND `store.liveStatus` MUST be `'connecting'` while fetch is in flight, transitioning to `'live'` after subscription is established

#### Scenario: Cached slugs after first subscribe

- GIVEN slugs were lazy-fetched on a previous subscribe and cached
- WHEN `store.subscribe('melding')` is called again (second component, same type)
- THEN no `fetchRegister` or `fetchSchema` call MUST be made
- AND the subscription MUST attach immediately to the existing event listener (per REQ-ST-LU-003)

#### Scenario: Lazy fetch failure surfaces as rejection

- GIVEN `store.subscribe('melding')` is called and the register UUID does not resolve
- WHEN `store.fetchRegister(registerUuid)` rejects
- THEN `store.subscribe()` MUST reject with an error message including `"melding"` and the underlying cause
- AND no malformed event key (e.g. `or-collection-null-null`) MUST be sent to the transport
- AND `store.liveStatus` MUST NOT change

#### Scenario: Object subscriptions do not need slug lookup

- GIVEN `store.subscribe('melding', 'uuid-abc')` is called (object form, with id)
- THEN slug lookup MUST be skipped entirely (event key is `or-object-uuid-abc`, slug-independent)
- AND the subscription MUST NOT depend on `objectTypeRegistry[type].registerSlug` being populated

---

## Current Implementation Status

**Already implemented — all requirements are fulfilled:**

- **Files**: `src/store/useObjectStore.js`, `src/store/createSubResourcePlugin.js`, `src/store/plugins/` (7 plugins)
- **REQ-ST-001 to REQ-ST-009**: Full base store with CRUD, pagination, facets, search terms, caching, batch operations, error handling
- **REQ-ST-010 to REQ-ST-011**: Factory function and plugin architecture with merge utilities
- **REQ-ST-012**: `createSubResourcePlugin` factory for custom plugins
- **REQ-ST-013**: All 7 built-in plugins (files, auditTrails, relations, lifecycle, selection, search, registerMapping)
- **REQ-ST-014**: All getters with safe defaults
- **REQ-ST-015**: Verified working in OpenRegister, Pipelinq, and Procest consumer apps

## Standards & References

- **Pinia store pattern**: Options API style via `defineStore` (not Setup Stores), required for Vue 2 compatibility
- **Vue 2 reactivity**: All state mutations use object spreading (`{ ...state, [key]: value }`) to ensure Vue 2 detects new reactive properties
- **OpenRegister REST API**: `GET/POST/PUT/DELETE /apps/openregister/api/objects/{register}/{schema}[/{id}]`
- **OpenRegister Schema API**: `GET /apps/openregister/api/schemas/{schemaId}`
- **OpenRegister Register API**: `GET /apps/openregister/api/registers/{registerId}`
- **Request headers**: Built via `buildHeaders()` utility (includes Nextcloud CSRF token)
- **Error shape**: Unified `ApiError` type from `src/utils/errors.js`
- **ID extraction**: `extractId()` from `src/utils/id.js` supports string IDs, `.id`, and `['@self'].id`

## Specificity Assessment

- **Specific enough to implement?** Yes — all 15 requirements cover the complete store surface area including factory, plugins, error handling, caching, and consumer integration patterns.
- **All open questions resolved:**
  - `registerObjectType` signature documented as `(slug, schemaId, registerId)` matching implementation
  - Batch operations (`deleteObjects`, `resolveReferences`) fully specified
  - All 7 built-in plugins documented with state/getters/actions
  - `createSubResourcePlugin` factory fully specified
  - Consumer app integration patterns documented from real-world usage
