# Tasks: dashboard-fit-cells-close-up

### Task 1: Split rows on a packing grid with a size-to-content cell
- **spec_ref**: `openspec/changes/dashboard-fit-cells-close-up/specs/dashboard-grid/spec.md#requirement-a-size-to-content-cell-ends-at-its-content`
- **files**: `src/components/CnDashboardGrid/CnDashboardGrid.vue`
- [x] Implement: `wantsRowSplit`, `rowSplit`, `scaledRow`, `rebuildGrid`, no layout-change in split rows
- [x] Test: `tests/components/CnDashboardGridRowSplit.spec.js`; e2e `e2e/l11-fit-cell-close-up.e2e.js`
