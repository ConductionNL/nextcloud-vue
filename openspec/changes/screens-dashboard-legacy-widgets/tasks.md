# Tasks: screens-dashboard-legacy-widgets

## Implementation Tasks

### Task 1: Pin catalog widgets on a config.widgets dashboard
- **spec_ref**: `openspec/changes/screens-dashboard-legacy-widgets/specs/dashboard-page/spec.md#requirement-a-configwidgets-dashboard-mounts-catalog-widgets`
- **files**: `tests/components/ScreensDashboardLegacyWidgets.spec.js`
- [x] Test: banner, table and stat mount through the registry; the menu is off with `showWidgetActions: false`

### Task 2: Drop the Add footer on a board dashboard without widget actions
- **spec_ref**: `openspec/changes/screens-dashboard-legacy-widgets/specs/dashboard-page/spec.md#requirement-a-board-dashboard-without-widget-actions-drops-the-add-footer`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`
- [x] Implement: `collectionContent()` in `registryWidgetBindings`
- [x] Test: footer off in the board look, kept with `allowCreate: true`, kept without the board look
- [ ] Browser: PtDashboard on :8080 (not run: app lane checks after the release)

### Task 3: Documentation
- **files**: `docs/components/cn-dashboard-page.md`
- [x] Document the footer rule next to `showWidgetActions`
