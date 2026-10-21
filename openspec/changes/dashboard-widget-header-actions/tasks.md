# Tasks: dashboard-widget-header-actions

### Task 1: A dashboard card draws its widget's header actions
- **spec_ref**: `openspec/changes/dashboard-widget-header-actions/specs/dashboard-widget-header-actions/spec.md#requirement-a-dashboard-card-draws-its-widgets-header-actions`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`, `docs/components/cn-widget-wrapper.md`
- [x] Implement: resolve per widget, the wrapper prop
- [x] Test: `tests/components/CnDashboardPageWidgetHeaderActions.spec.js`

### Task 2: A navigate target can be an instance page
- **spec_ref**: `openspec/changes/dashboard-widget-header-actions/specs/dashboard-widget-header-actions/spec.md#requirement-a-navigate-target-can-be-an-instance-page`
- **files**: `src/utils/actionsDispatcher.js`
- [x] Implement: `/index.php/` targets load in the window
- [x] Test: `tests/utils/actionsDispatcherInstancePath.spec.js`
