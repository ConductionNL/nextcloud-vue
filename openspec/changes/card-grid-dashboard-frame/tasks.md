# Tasks: card-grid-dashboard-frame

### Task 1: A card grid on a dashboard draws no frame of its own
- **spec_ref**: `openspec/changes/card-grid-dashboard-frame/specs/card-grid-dashboard-frame/spec.md#requirement-a-card-grid-on-a-dashboard-draws-no-frame-of-its-own`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnWidgetCardGrid/CnWidgetCardGrid.vue`, `src/css/look-board.css`
- [x] Implement: `chromeless` on CnWidgetCardGrid, `cellChromeBindings` in CnDashboardPage, cell inset
- [x] Test: `tests/components/CnDashboardPageCardGridFrame.spec.js`; e2e `e2e/l21-card-grid-dashboard-frame.e2e.js` (`?l8=card-grid-frame`)
