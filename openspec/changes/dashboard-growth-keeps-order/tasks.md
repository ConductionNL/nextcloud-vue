# Tasks: dashboard-growth-keeps-order

### Task 1: Push the cards under a growing cell down in order
- **spec_ref**: `openspec/changes/dashboard-growth-keeps-order/specs/dashboard-grid/spec.md#requirement-a-growing-cell-keeps-the-order-of-the-cards-under-it`
- **files**: `src/utils/gridStack.js`, `src/components/CnDashboardGrid/CnDashboardGrid.vue`
- [x] Implement: `itemsInRowOrder`, `planGrowth`, `keepOrderOnGrowth`, `contentRows`
- [x] Test: `tests/utils/gridStackPlanGrowth.spec.js`, `tests/components/CnDashboardGridGrowthOrder.spec.js`; e2e `e2e/l11-fit-cell-order.e2e.js`
