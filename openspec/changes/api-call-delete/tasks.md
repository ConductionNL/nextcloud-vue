# Tasks: api-call-delete

### Task 1: Send DELETE from an api-call
- **spec_ref**: `openspec/changes/api-call-delete/specs/api-call-delete/spec.md#requirement-an-api-call-action-can-send-delete`
- **files**: `src/utils/actionsDispatcher.js`, `src/schemas/app-manifest-v2.schema.json`, `docs/utilities/dispatch-action.md`
- [x] Implement: DELETE in `executeApiCall` and in the schema `method` enum (2.169.0)
- [x] Test: `tests/utils/actionsDispatcherW3.spec.js` (honours method: DELETE), `tests/schemas/app-manifest-v2.schema.spec.js`
