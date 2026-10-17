# Tasks: page-header-breadcrumb

### Task 1: A list, dashboard or settings page can show a breadcrumb and a meta note
- **spec_ref**: `openspec/changes/page-header-breadcrumb/specs/page-header/spec.md#requirement-a-list-dashboard-or-settings-page-can-show-a-breadcrumb-and-a-meta-note`
- **files**: `src/components/CnPageHeader/CnHeaderTrail.vue`, `src/components/CnPageHeader/CnPageHeader.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnSettingsPage/CnSettingsPage.vue`, `src/css/page-header.css`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement
- [x] Test: `tests/components/CnPageHeaderTrail.spec.js`; e2e `e2e/l25-page-header-breadcrumb.e2e.js` (`?l8=page-header-trail`)

### Task 2: A dashboard widget card can carry a line under its title
- **spec_ref**: `openspec/changes/page-header-breadcrumb/specs/page-header/spec.md#requirement-a-dashboard-widget-card-can-carry-a-line-under-its-title`
- **files**: `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`, `src/components/CnDashboardPage/CnDashboardPage.vue`
- [x] Implement
- [x] Test: `tests/components/CnPageHeaderTrail.spec.js`

### Task 3: A dashboard can show its period on the description line
- **spec_ref**: `openspec/changes/page-header-breadcrumb/specs/page-header/spec.md#requirement-a-dashboard-can-show-its-period-on-the-description-line`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`
- [x] Implement
- [x] Test: `tests/components/CnPageHeaderTrail.spec.js`; e2e `e2e/l25-page-header-breadcrumb.e2e.js`
