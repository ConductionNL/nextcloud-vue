# Store — Spec

## Purpose
Specifies the Pinia store (`useObjectStore`), factory function (`createObjectStore`), plugin architecture, and built-in plugins for OpenRegister CRUD operations.

**Files**: `src/store/useObjectStore.js`, `src/store/createSubResourcePlugin.js`, `src/store/plugins/`

---

## Requirements

### REQ-ST-001: Generic Object Store

The store MUST provide CRUD operations for any OpenRegister object type.

#### Scenario: Register an object type

- GIVEN `store.registerObjectType('lead', { schema: 'lead-schema', register: 'crm' })`
- THEN the store MUST track this type in `objectTypeRegistry`
- AND subsequent operations MUST use the registered schema/register

#### Scenario: Fetch collection

- GIVEN a registered type `'lead'`
- WHEN `store.fetchCollection('lead', { page: 1, limit: 20 })` is called
- THEN it MUST make an API call to OpenRegister
- AND store the results in `collections.lead`
- AND store pagination in `pagination.lead`
- AND set `loading.lead = true` during the request

#### Scenario: Fetch single object

- WHEN `store.fetchObject('lead', '123')` is called
- THEN it MUST store the result in `objects.lead['123']`

#### Scenario: Save object (create)

- WHEN `store.saveObject('lead', { title: 'New Lead' })` is called without `id`
- THEN it MUST POST to the API and return the created object

#### Scenario: Save object (update)

- WHEN `store.saveObject('lead', { id: '123', title: 'Updated' })` is called with `id`
- THEN it MUST PUT to the API and return the updated object

#### Scenario: Delete object

- WHEN `store.deleteObject('lead', '123')` is called
- THEN it MUST DELETE via the API
- AND remove the object from `objects.lead` and `collections.lead`

### REQ-ST-002: Search and Caching

#### Scenario: Search collection

- WHEN `store.searchCollection('lead', 'gemeente')` is called
- THEN it MUST pass `_search=gemeente` to the API
- AND update `collections.lead` with results

#### Scenario: Schema caching

- GIVEN a schema has been fetched for a type
- WHEN `store.getSchema('lead')` is called
- THEN it MUST return the cached schema (not re-fetch)

### REQ-ST-003: Store Factory

#### Scenario: Multiple store instances

- GIVEN `createObjectStore('store-a')` and `createObjectStore('store-b')`
- THEN two independent store instances MUST exist
- AND operations on one MUST NOT affect the other

### REQ-ST-004: Plugin Architecture

The store MUST support plugins that contribute state, getters, and actions.

#### Scenario: Registering a plugin

- GIVEN `createObjectStore('my-store', { plugins: [filesPlugin, relationsPlugin] })`
- THEN the store MUST include all plugin state, getters, and actions
- AND plugin actions MUST be callable alongside base store actions

### REQ-ST-005: Built-In Plugins

#### Scenario: auditTrailsPlugin

- GIVEN the audit trails plugin is registered
- THEN actions for fetching and managing audit trails per object MUST be available

#### Scenario: relationsPlugin

- GIVEN the relations plugin is registered
- THEN actions for managing object-to-object relations MUST be available

#### Scenario: filesPlugin

- GIVEN the files plugin is registered
- THEN actions for uploading, listing, and deleting files per object MUST be available

#### Scenario: lifecyclePlugin

- GIVEN the lifecycle plugin is registered
- THEN actions for managing lifecycle states (draft, published, archived) MUST be available

#### Scenario: registerMappingPlugin

- GIVEN the register mapping plugin is registered
- THEN actions for configuring register-to-schema mappings MUST be available

### REQ-ST-006: Error Handling

#### Scenario: API error

- GIVEN an API call fails with a 403 response
- WHEN the store processes the error
- THEN `errors[type]` MUST contain a parsed error object via `parseResponseError()`
- AND `loading[type]` MUST be set to false

---

### Current Implementation Status

**Already implemented — all requirements are fulfilled:**

- **Files**: `src/store/useObjectStore.js`, `src/store/createSubResourcePlugin.js`, `src/store/plugins/`
- **REQ-ST-001 (Generic Object Store)**: `registerObjectType(slug, schemaId, registerId)` initializes all state buckets with Vue 2-compatible object spreading. `fetchCollection(type, params)` with pagination, facet data parsing, and auto `_facets=extend`. `fetchObject(type, id)` with caching. `saveObject(type, data)` with POST/PUT branching. `deleteObject(type, id)` with collection/cache cleanup. Also provides `deleteObjects(type, ids)` for batch deletes and `resolveReferences(type, ids)` for batch cache-first fetching (not in spec).
- **REQ-ST-002 (Search and Caching)**: `setSearchTerm`/`clearSearchTerm` manage search terms per type. Schema caching in `fetchSchema()` — returns cached on second call. Facet data cached per type in `facets` state.
- **REQ-ST-003 (Store Factory)**: `createObjectStore(storeId, options)` creates independent Pinia store instances via `defineObjectStore()`. Supports `options.plugins` and `options.baseUrl`.
- **REQ-ST-004 (Plugin Architecture)**: `mergePluginState`, `mergePluginGetters`, `mergePluginActions` merge plugin contributions at definition time. `clearAllSubResources()` calls each plugin's clear method.
- **REQ-ST-005 (Built-In Plugins)**: All five plugins exist in `src/store/plugins/`:
  - `auditTrailsPlugin` (`auditTrails.js`)
  - `relationsPlugin` (`relations.js`)
  - `filesPlugin` (`files.js`)
  - `lifecyclePlugin` (`lifecycle.js`)
  - `registerMappingPlugin` (`registerMapping.js`)
  - Also: `createSubResourcePlugin` factory (`src/store/createSubResourcePlugin.js`) for building custom plugins.
- **REQ-ST-006 (Error Handling)**: `parseResponseError()` for HTTP errors, `networkError()` for TypeError/network failures, `genericError()` for other exceptions. Loading always set to false in `finally` blocks.

**Additional features not in spec:**
- `unregisterObjectType(slug)` for cleanup
- `configure(options)` for custom base URL
- `deleteObjects(type, ids)` for batch deletes with partial success reporting
- `resolveReferences(type, ids)` for batch reference resolution
- `clearError(type)` for manual error clearing
- Getters: `objectTypes`, `getCollection`, `getObject`, `getCachedObject`, `isLoading`, `getError`, `getPagination`, `getSearchTerm`, `getSchema`, `getFacets`
- Auto `_facets=extend` when schema has facetable properties

**Exports**: `useObjectStore` (default instance), `createObjectStore` (factory), `createSubResourcePlugin`, `emptyPaginated`, and all five built-in plugins from `src/store/index.js`.

### Standards & References

- Pinia store pattern (Options API style via `defineStore`)
- Vue 2 reactivity: Uses object spreading (`{ ...state, [key]: value }`) instead of direct property assignment for reactive state updates
- OpenRegister REST API: `GET/POST/PUT/DELETE /apps/openregister/api/objects/{register}/{schema}[/{id}]`
- OpenRegister Schema API: `GET /apps/openregister/api/schemas/{schemaId}`
- Nextcloud request headers via `buildHeaders()` utility

### Specificity Assessment

- **Specific enough to implement?** Yes — the spec covers all major CRUD operations and plugin architecture. Already fully implemented.
- **Missing/ambiguous:**
  - REQ-ST-001 shows `registerObjectType` with an object argument `{ schema, register }` but the implementation takes two separate arguments `(slug, schemaId, registerId)`.
  - REQ-ST-002 does not mention the `_facets=extend` auto-include behavior or facet data parsing.
  - REQ-ST-005 does not describe the `createSubResourcePlugin` factory or what state/actions each plugin provides.
  - No mention of `deleteObjects` batch operation, `resolveReferences`, or `unregisterObjectType`.
  - No mention of `configure()` for custom base URL.
- **Open questions:**
  - Should the spec document the `registerObjectType` signature as `(slug, schemaId, registerId)` to match implementation?
  - Should batch operations (`deleteObjects`, `resolveReferences`) be added to the spec?
