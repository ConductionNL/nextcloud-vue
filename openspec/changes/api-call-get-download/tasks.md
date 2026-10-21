# Tasks: api-call-get-download

### Task 1: An api-call can GET a download
- **spec_ref**: `openspec/changes/api-call-get-download/specs/api-call-get-download/spec.md#requirement-an-api-call-can-get-a-download`
- **files**: `src/utils/actionsDispatcher.js`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `method: "GET"` with params as the query string; schema enum and version 2.135.0 with its hash
- [x] Test: `tests/utils/actionsDispatcherW3.spec.js`, `tests/utils/validateManifest.wave3.spec.js`
