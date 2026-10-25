# Tasks: board-save-view-only-when-changed

### Task 1: The board look offers Save view once the view has changed
- **spec_ref**: `openspec/changes/board-save-view-only-when-changed/specs/saved-views/spec.md#requirement-the-board-look-offers-save-view-once-the-view-has-changed`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: viewChanged set by the change handlers, reset on apply and save, toolbarSavesView reads it in the board look
- [x] Test: `tests/components/CnIndexPageSaveViewWhenChanged.spec.js`
