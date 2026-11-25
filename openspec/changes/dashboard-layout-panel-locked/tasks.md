# Tasks: dashboard-layout-panel-locked

### Task 1: Locked sections in the layout panel
- **spec_ref**: `openspec/changes/dashboard-layout-panel-locked/specs/dashboard-page/spec.md#requirement-a-section-the-page-locks-stays-shown`
- **files**: `src/components/CnDashboardLayoutPanel/CnDashboardLayoutPanel.vue`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `l10n/nl.json`, `l10n/en.json`, `docs/components/cn-dashboard-page.md`
- [x] Implement: `layoutPanelLocked` prop and manifest key, disabled checkbox with "Always shown", never stored hidden, drawn even when an older record hid it, schema 2.200.0
- [x] Test: `tests/components/CnDashboardLayoutPanel.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`, `tests/l10n/dashboardLayoutPanelDutch.spec.js`
