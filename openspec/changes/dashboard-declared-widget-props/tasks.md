# Tasks: dashboard-declared-widget-props

### Task 1: A dashboard widget receives only the content keys it declares
- **spec_ref**: `openspec/changes/dashboard-declared-widget-props/specs/dashboard-page/spec.md#requirement-a-dashboard-widget-receives-only-the-content-keys-it-declares`
- **files**: `src/utils/declaredProps.js`, `src/components/CnDashboardPage/CnDashboardPage.vue`
- [x] Implement: `declaredPropNames` / `pickDeclaredProps`, `registryWidgetProps` on both registry branches
- [x] Test: `tests/utils/declaredProps.spec.js`, `tests/components/CnDashboardPageDeclaredProps.spec.js`; e2e `e2e/l25-dashboard-declared-props.e2e.js` (`?l8=declared-props`)
