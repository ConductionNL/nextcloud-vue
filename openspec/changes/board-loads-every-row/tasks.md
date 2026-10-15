# Tasks: board-loads-every-row

### Task 1: The store adds a page after the loaded rows
- **spec_ref**: `openspec/changes/board-loads-every-row/specs/board-view/spec.md#requirement-the-index-board-shows-every-matching-row`
- **files**: `src/store/useObjectStore.js`, `src/composables/useListView.js`
- [x] Implement: `fetchCollection(..., { append, isCurrent })`, `useListView().loadMore()`
- [x] Test: `tests/composables/useListViewLoadMore.spec.js` (real store)

### Task 2: The board view loads every row
- **spec_ref**: `openspec/changes/board-loads-every-row/specs/board-view/spec.md#requirement-the-index-board-shows-every-matching-row`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnIndexPage/useSelfFetchList.js`, `src/css/index-page.css`
- [x] Implement: `BOARD_PAGE_SIZE` on entering and opening in board view, restore on leaving, footer count + "Load more"
- [x] Test: `tests/components/CnIndexPageBoardLoadsAll.spec.js`
- [x] Test: e2e `e2e/l15-board-loads-every-row.e2e.js`
