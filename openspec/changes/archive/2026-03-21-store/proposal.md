# Store — Spec

## Problem
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

## Proposed Solution
Implement Store — Spec following the detailed specification. Key requirements include:
- Requirement: REQ-ST-001 — Object Type Registration
- Requirement: REQ-ST-002 — Fetch Collection (List)
- Requirement: REQ-ST-003 — Fetch Single Object
- Requirement: REQ-ST-004 — Save Object (Create and Update)
- Requirement: REQ-ST-005 — Delete Object

## Scope
This change covers all requirements defined in the store specification.

## Success Criteria
- Register an object type with separate arguments
- Vue 2 reactivity on registration
- Create type slug from objects
- Unregister an object type
- Operations on unregistered type throw
