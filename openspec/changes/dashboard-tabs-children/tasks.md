# Tasks: dashboard-tabs-children

### Task 1: A dashboard hands a container widget its siblings
- **spec_ref**: `openspec/changes/dashboard-tabs-children/specs/dashboard-page/spec.md#requirement-a-tabs-widget-on-a-dashboard-renders-the-widgets-its-tabs-name`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnTabsWidget/CnTabsWidget.vue`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`, `src/utils/widgetDispatch.js`
- [x] Implement: `containerBindings(item)` on the registry branches; `countSourceOf` reads `content.source`; a dashboard child resolves its type as written
- [x] Test: `tests/components/CnDashboardPageTabsChildren.spec.js`; e2e `e2e/l16-bank-tabs.e2e.js`
