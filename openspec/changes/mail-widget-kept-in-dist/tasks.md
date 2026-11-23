# Tasks: mail-widget-kept-in-dist

### Task 1: Widget registrations are kept by the sideEffects allowlist
- **spec_ref**: `openspec/changes/mail-widget-kept-in-dist/specs/widget-registration/spec.md#requirement-a-widget-registration-survives-tree-shaking`
- **files**: `src/components/CnMailTab/dashboardRegistration.js`, `src/components/CnMailTab/index.js`, `src/components/CnWidgetGrid/registerDashboardWidgets.js`
- [x] Implement: move the `mail` registration into dashboardRegistration.js and import it from the registrar
- [x] Test: `tests/packaging/widget-registrations-survive-tree-shaking.spec.js`
