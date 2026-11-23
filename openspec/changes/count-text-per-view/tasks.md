# Tasks: count-text-per-view

### Task 1: The count line can differ per view
- **spec_ref**: `openspec/changes/count-text-per-view/specs/index-page/spec.md#requirement-the-count-line-can-differ-per-view`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/utils/savedViewOverrides.js`, `src/utils/queryPresets.js`
- [x] Implement: `countTextByView` prop, the open view's line before `countText`, a scope's line first; a preset or view with `countText` clears `countTextByView`
- [x] Test: `tests/components/CnIndexPageCountTextByView.spec.js`
