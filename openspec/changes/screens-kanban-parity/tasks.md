# Tasks: screens-kanban-parity

## Implementation Tasks

### Task 1: The board column grid
- **spec_ref**: `openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-board-column-grid`
- **files**: `src/components/CnBoardView/CnBoardView.vue`, `src/css/board.css` (new), `src/components/CnObjectKanban/CnObjectKanban.vue`
- [ ] Implement: grid tracks, gap, column panel, horizontal scroll; same tokens on CnObjectKanban
- [ ] Test: column widths at four and six columns in a browser

### Task 2: The board column header
- **spec_ref**: `openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-board-column-header`
- **files**: `src/components/CnBoardView/CnBoardView.vue`, `src/utils/boardColumns.js`, `src/schemas/app-manifest-v2.schema.json`
- [ ] Implement: dot colour resolution, count badge, `sumField` line
- [ ] Test: colour fallbacks, sum formatting, heading level

### Task 3: The board card anatomy
- **spec_ref**: `openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-board-card-anatomy`
- **files**: `src/components/CnBoardView/CnBoardView.vue`, `src/schemas/app-manifest-v2.schema.json`
- [ ] Implement: `config.board.card` roles, fallback from `cardFields`, due tones, avatar
- [ ] Test: each role empty and filled; separator drops with an empty field

### Task 4: The card shows no form controls at rest
- **spec_ref**: `openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-card-shows-no-form-controls-at-rest`
- **files**: `src/components/CnBoardView/CnBoardView.vue`, `tests/a11y/CnBoardView.a11y.spec.js`, `e2e/screens-kanban-parity.e2e.js`
- [ ] Implement: title link, card menu with Move to, M key
- [ ] Test: one transition call per move; axe in both looks; middle click still opens a new tab

### Task 5: A long column is cut with a show-more button
- **spec_ref**: `openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-a-long-column-is-cut-with-a-show-more-button`
- **files**: `src/components/CnBoardView/CnBoardView.vue`, `src/schemas/app-manifest-v2.schema.json`
- [ ] Implement: `columnLimit`, reveal per column, next page when paged
- [ ] Test: hidden count, badge total, paged load

### Task 6: Documentation
- **files**: `docs/components/cn-board-view.md`
- [ ] JSDoc on the new keys; the DqWerkbord manifest example
