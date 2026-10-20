# Tasks: board-index-toolbar-controls

### Task 1: The search field is 40px under Nextcloud's input rule
- **spec_ref**: `openspec/changes/board-index-toolbar-controls/specs/board-index-toolbar-controls/spec.md#requirement-the-search-field-is-40px-under-nextclouds-input-rule`
- **files**: `src/css/look-board-index.css`
- [x] Implement: `height` and `min-height: 40px !important` on the board search input
- [x] Test: `tests/css/lookBoardIndexToolbarControls.spec.js`

### Task 2: The Filter button draws the control border
- **spec_ref**: `openspec/changes/board-index-toolbar-controls/specs/board-index-toolbar-controls/spec.md#requirement-the-filter-button-draws-the-control-border`
- **files**: `src/css/look-board-index.css`
- [x] Implement: `border: 1px solid var(--cn-board-control-border)` on the Filter and Filter menu buttons
- [x] Test: `tests/css/lookBoardIndexToolbarControls.spec.js`
