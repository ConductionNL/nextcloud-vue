# Tasks: dashboard-side-column-width

### Task 1: A dashboard can draw its side column at a fixed width
- **spec_ref**: `openspec/changes/dashboard-side-column-width/specs/dashboard-side-column-width/spec.md#requirement-a-dashboard-can-draw-its-side-column-at-a-fixed-width`
- **files**: `src/components/CnDashboardGrid/CnDashboardGrid.vue`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/mixins/pageViews.js`, `src/schemas/app-manifest-v2.schema.json`, docs
- [x] Implement: `sideColumn` on the grid, `gridSideColumn` on the page and views, schema 2.142.0
- [x] Test: `tests/components/CnDashboardGridSideColumn.spec.js`, `tests/components/CnDashboardPageSideColumn.spec.js`
