# Tasks: board-tabs-overflow-in-actions

### Task 1: Board tabs list their overflow in the Actions menu
- **spec_ref**: `openspec/changes/board-tabs-overflow-in-actions/specs/board-tabs-overflow-in-actions/spec.md#requirement-board-tabs-list-their-overflow-in-the-actions-menu`
- **files**: `src/components/CnTabsWidget/CnTabsWidget.vue`, `src/components/CnActionsMenu/CnActionsMenu.vue`
- [x] Implement: overflow / maxVisibleTabs honoured in the board look, History pinned, overflow tabs as `lead-items`
- [x] Test: `tests/components/CnTabsWidgetBoardOverflow.spec.js`, `tests/components/CnTabsBoardLook.spec.js`

### Task 2: An opened overflow tab joins the strip before the last tab
- **spec_ref**: `openspec/changes/board-tabs-overflow-in-actions/specs/board-tabs-overflow-in-actions/spec.md#requirement-an-opened-overflow-tab-joins-the-strip-before-the-last-tab`
- **files**: `src/components/CnTabs/CnTabs.vue`
- [x] Implement: `overflowInNavEnd` prop on CnTabs
- [x] Test: `tests/components/CnTabsWidgetBoardOverflow.spec.js`
