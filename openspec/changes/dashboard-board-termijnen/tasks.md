# Tasks: dashboard-board-termijnen

### Task 1: Actions on the title row
- **spec_ref**: `openspec/changes/dashboard-board-termijnen/specs/dashboard-page/spec.md#requirement-the-board-dashboard-header-keeps-its-actions-on-the-title-row`
- **files**: `src/css/look-board.css`
- [x] Implement: the board header as a grid, the left column `display: contents`, the description under both columns
- [x] Test: `tests/css/lookBoardDashboardHeaderRow.spec.js`, e2e `e2e/comp2-termijnen-board.e2e.js`

### Task 2: The KPI row tile inset
- **spec_ref**: `openspec/changes/dashboard-board-termijnen/specs/dashboard-page/spec.md#requirement-a-board-kpi-row-tile-has-the-boards-inset`
- **files**: `src/css/look-board.css`
- [x] Implement: no card-fit padding around a stacked board stat tile in the KPI row
- [x] Test: `tests/css/lookBoardDashboardHeaderRow.spec.js`, e2e `e2e/comp2-termijnen-board.e2e.js`

### Task 3: A segmented page filter on the description line
- **spec_ref**: `openspec/changes/dashboard-board-termijnen/specs/dashboard-page/spec.md#requirement-a-page-filter-as-a-segmented-group-on-the-description-line`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/composables/useEndpointSource.js`
- [x] Implement: `control` and `placement` on a page filter; tokens in `responsePath`
- [x] Test: `tests/components/CnDashboardPageSegmentedPageFilter.spec.js`, `tests/composables/useEndpointSourceResponsePathTokens.spec.js`
