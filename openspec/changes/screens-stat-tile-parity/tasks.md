# Tasks: screens-stat-tile-parity

## Implementation Tasks

### Task 1: Stacked by default in the board look, no underline
- **spec_ref**: `openspec/changes/screens-stat-tile-parity/specs/dashboard-page/spec.md#requirement-the-board-kpi-tile-is-stacked-by-default`
- **files**: `src/components/CnStatWidget/CnStatWidget.vue`, `src/css/kpi-card.css`
- [x] Implement: `cardLayout` falls back to `stacked` in the board look; `a.cn-kpi-card--board` without underline
- [x] Test: stacked class and caption line in the board look; horizontal without it; explicit layout kept

### Task 2: The icon at the end of the label row
- **spec_ref**: `openspec/changes/screens-stat-tile-parity/specs/dashboard-page/spec.md#requirement-the-board-kpi-tile-can-carry-its-icon-at-the-end`
- **files**: `src/components/CnStatWidget/CnStatWidget.vue`, `src/css/kpi-card.css`
- [x] Implement: `content.iconPlacement: "end"`, the 32px circle, the state tone
- [x] Test: order in the label row, tone per variant and rule, value colour, no effect without the board look
- [ ] Browser: compare the DqDashboard tiles on :8080 with the board (not run: app lane checks after the release)

### Task 3: Documentation
- **files**: `docs/components/cn-stat-widget.md`
- [x] Document `iconPlacement` and the board default layout
