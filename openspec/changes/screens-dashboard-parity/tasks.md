# Tasks: screens-dashboard-parity

## Implementation Tasks

### Task 1: The board dashboard header
- **spec_ref**: `openspec/changes/screens-dashboard-parity/specs/dashboard-page/spec.md#requirement-the-board-dashboard-header`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/css/dashboard.css`
- [ ] Implement: h1 and subtitle values, header action order in the board look
- [ ] Test: heading level and button order in both looks

### Task 2: The period as a segmented group
- **spec_ref**: `openspec/changes/screens-dashboard-parity/specs/dashboard-page/spec.md#requirement-the-period-as-a-segmented-group`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [ ] Implement: `control: "segmented"`, custom range as the last segment
- [ ] Test: `aria-pressed`, one `date-range-change` per press, persistence

### Task 3: A compact segmented control
- **spec_ref**: `openspec/changes/screens-dashboard-parity/specs/dashboard-page/spec.md#requirement-a-compact-segmented-control`
- **files**: `src/components/CnSegmentedControl/CnSegmentedControl.vue`
- [ ] Implement: `size` prop and compact styles
- [ ] Test: computed heights in a browser; normal unchanged

### Task 4: The board KPI tile
- **spec_ref**: `openspec/changes/screens-dashboard-parity/specs/dashboard-page/spec.md#requirement-the-board-kpi-tile`
- **files**: `src/components/CnStatWidget/CnStatWidget.vue`, `src/components/CnStatsBlock/CnStatsBlock.vue`, `src/css/kpi-card.css`
- [ ] Implement: board values, icon only with a link, warning-only caption colour
- [ ] Test: icon presence by link, caption tone, value size per look

### Task 5: A KPI row above the grid
- **spec_ref**: `openspec/changes/screens-dashboard-parity/specs/dashboard-page/spec.md#requirement-a-kpi-row-above-the-grid`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnKpiGrid/CnKpiGrid.vue`, `src/schemas/app-manifest-v2.schema.json`, `e2e/screens-dashboard-parity.e2e.js`
- [ ] Implement: `config.kpiRow`, `columns: "auto"`
- [ ] Test: reflow at two widths in a browser; the row is absent from the emitted layout

### Task 6: Documentation
- **files**: `docs/components/cn-dashboard-page.md`, `docs/components/cn-kpi-grid.md`, `docs/components/cn-segmented-control.md`, `docs/components/cn-stat-widget.md`
- [ ] JSDoc on the new props and keys; the board-look examples
