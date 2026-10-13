# Tasks: screens-column-hidden-by-default

### Task 1: Start a hidden column hidden
- **spec_ref**: `openspec/changes/screens-column-hidden-by-default/specs/index-page/spec.md#requirement-a-column-marked-hidden-starts-hidden`
- **files**: `src/components/CnIndexPage/useSelfFetchList.js`, `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: the seed leaves hidden columns out; `tableColumns` honours `hidden`
- [x] Test: `tests/components/CnIndexPageHiddenColumns.spec.js`; e2e `e2e/l8-column-hidden-by-default.e2e.js` (fails without the change)
