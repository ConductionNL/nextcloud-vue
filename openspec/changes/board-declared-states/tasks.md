# Tasks: board-declared-states

### Task 1: Declared states for a board column field
- **spec_ref**: `openspec/changes/board-declared-states/specs/board-view/spec.md#requirement-a-board-can-declare-the-states-its-columns-come-from`
- **files**: `src/utils/boardReferenceColumns.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `declaredStatesOf`, `columnFieldsOf` keeps `states`, `boardFieldSchema` reads them
- [x] Test: `tests/utils/boardDeclaredStates.spec.js`
