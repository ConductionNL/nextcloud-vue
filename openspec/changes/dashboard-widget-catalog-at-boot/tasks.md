# Tasks: dashboard-widget-catalog-at-boot

> `CnDashboardPage` imports the widget catalog (ADR-032 `kind: code`).
> Checkbox budget: 2 tasks × 2 = 4 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The dashboard page registers the catalog
- **spec_ref**: `openspec/changes/dashboard-widget-catalog-at-boot/specs/dashboard-page/spec.md#requirement-the-widget-catalog-is-registered-when-a-dashboard-page-loads`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnWidgetGrid/registerDashboardWidgets.js`, `src/components/CnPageRenderer/CnPageRenderer.vue`, `package.json`, `src/components/__tests__/CnDashboardPageCatalog.spec.js`
- **acceptance_criteria**:
  - A fresh module registry that mounts only `CnDashboardPage` renders a `stat` item as `CnStatWidget`
  - The catalog modules are listed in `sideEffects` and survive a production consumer build, asserted on a built fixture
  - JSDoc on `registerBuiltinDashboardWidgets` says it is now optional
- [ ] Implement
- [ ] Test

### Task 2: Registration is idempotent
- **spec_ref**: `openspec/changes/dashboard-widget-catalog-at-boot/specs/dashboard-page/spec.md#requirement-registration-runs-once`
- **files**: `src/components/CnWidgetGrid/registerDashboardWidgets.js`, `src/registry/__tests__/dashboardWidgetRegistry.spec.js`
- **acceptance_criteria**:
  - A second call changes nothing, asserted on the registry size and entries
  - No warning is logged on the second call
  - `npm test` and `npm run build` pass; the getting-started doc drops the mandatory call
- [ ] Implement
- [ ] Test
