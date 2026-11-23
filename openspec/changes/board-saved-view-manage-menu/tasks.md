# Tasks: board-saved-view-manage-menu

### Task 1: The manage menu's look
- **spec_ref**: `openspec/changes/board-saved-view-manage-menu/specs/board-saved-view-manage-menu/spec.md#requirement-a-saved-views-manage-menu-is-the-boards-menu`
- **files**: `src/css/look-board.css`, `src/components/CnSavedViewsPanel/CnSavedViewsPanel.vue`
- [x] Implement: popover width, rows, descriptions, separator, red Delete, refresh icon
- [x] Test: `tests/css/lookBoardSavedViewManageMenu.spec.js`, `tests/components/SavedViewManageMenuBoard.spec.js`

### Task 2: Copy an own view
- **spec_ref**: `openspec/changes/board-saved-view-manage-menu/specs/board-saved-view-manage-menu/spec.md#requirement-an-own-view-can-be-copied`
- **files**: `src/components/CnSavedViewsPanel/CnSavedViewsPanel.vue`, `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: owner gets Save a copy; the copy is named "{name} (copy)"
- [x] Test: `tests/components/SavedViewManageMenuBoard.spec.js`, `tests/components/CnSavedViewsManage.spec.js`

### Task 3: The pin marker
- **spec_ref**: `openspec/changes/board-saved-view-manage-menu/specs/board-saved-view-manage-menu/spec.md#requirement-a-view-in-the-app-menu-is-marked`
- **files**: `src/components/CnSavedViewsPanel/CnSavedViewsPanel.vue`
- [x] Implement: 14px pin in the board look, ", in the menu" in the accessible name
- [x] Test: `tests/components/SavedViewManageMenuBoard.spec.js`

### Task 4: The row whose menu is open
- **spec_ref**: `openspec/changes/board-saved-view-manage-menu/specs/board-saved-view-manage-menu/spec.md#requirement-the-row-whose-menu-is-open-is-marked`
- **files**: `src/css/look-board-index.css`
- [x] Implement: tint and ink on the selected row and the row with its menu open
- [x] Test: `tests/css/lookBoardSavedViewManageMenu.spec.js`
