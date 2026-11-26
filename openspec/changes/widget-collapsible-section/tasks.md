# Tasks: widget-collapsible-section

### Task 1: A card that folds to its header
- **spec_ref**: `openspec/changes/widget-collapsible-section/specs/dashboard-page/spec.md#requirement-a-widget-can-fold-to-its-header`
- **files**: `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `l10n/en.json`, `l10n/nl.json`, `docs/components/cn-widget-wrapper.md`, `docs/components/cn-dashboard-page.md`
- [x] Implement: `collapsible`, `collapsed`, `collapseLabel`, `expandLabel` props and the `toggle-collapse` event on CnWidgetWrapper; CnDashboardPage reads `collapsible` from the widget definition or layout entry
- [x] Test: `tests/components/CnWidgetCollapsible.spec.js`

### Task 2: The fold is stored with the user's layout
- **spec_ref**: `openspec/changes/widget-collapsible-section/specs/dashboard-page/spec.md#requirement-a-folded-widget-stays-folded-for-that-user`
- **files**: `src/store/plugins/dashboardLayouts.js`, `src/components/CnDashboardPage/CnDashboardPage.vue`
- [x] Implement: `collapsed: true` kept by the stored record and by `mergeUserLayout`; the page saves a fold with the user layout, keeps it for the visit without one, and Back to default opens it
- [x] Test: `tests/components/CnWidgetCollapsible.spec.js`
