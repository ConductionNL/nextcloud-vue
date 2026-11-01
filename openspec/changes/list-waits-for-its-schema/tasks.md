# Tasks: list-waits-for-its-schema

### Task 1: A refresh waits for the schema being loaded
- **spec_ref**: `openspec/changes/list-waits-for-its-schema/specs/list-waits-for-its-schema/spec.md`
- **files**: `src/composables/useListView.js`
- [x] Implement: `refresh()` awaits the pending mount schema request
- [x] Test: `tests/composables/useListViewWaitsForSchema.spec.js`
