# Tasks: screens-index-table-fit-parity

## Implementation Tasks

### Task 1: The board index table fits its card
- **spec_ref**: `openspec/changes/screens-index-table-fit-parity/specs/index-table-fit/spec.md#requirement-the-board-index-table-fits-its-card`
- **files**: `src/css/look-board-index.css`, `src/components/CnDataTable/CnDataTable.vue`, `e2e/harness/ScreensIndexHarness.vue`, `e2e/screens-index-table-fit-parity.e2e.js`, `tests/components/CnDataTableTitleHead.spec.js`
- [x] Implement: fixed layout, 18% first column, ellipsis cells, header funnel kept, board paddings, `cn-table-head--title`
- [x] Test: e2e at 1440px (fits, menus inside, funnels inside, first column wider, values cut) with a control without the look; fails without the CSS (table 1596px in a 1118px card); unit test for the header class

### Task 2: Live check
- [ ] Pixel diff PqTickets on :8080 (not run: the app runs the released package)
