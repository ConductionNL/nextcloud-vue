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
