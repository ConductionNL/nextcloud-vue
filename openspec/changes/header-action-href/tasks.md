# Tasks: header-action-href

### Task 1: Resolve a manifest href
- **spec_ref**: `openspec/changes/header-action-href/specs/header-action-href/spec.md#requirement-a-header-action-href-resolves-to-a-url-on-this-instance-or-an-allowed-scheme`
- **files**: `src/utils/actionLink.js`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `resolveManifestHref`, schema `href` pattern and `target`
- [x] Test: `tests/utils/actionLink.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`

### Task 2: Render a header action with href as a link on every page type
- **spec_ref**: `openspec/changes/header-action-href/specs/header-action-href/spec.md#requirement-a-header-action-with-href-is-a-link-that-runs-and-emits-nothing`
- **files**: `src/utils/actionLink.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnDetailPage/CnDetailPage.vue`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnReportsPage/CnReportsPage.vue`, `src/components/CnActionButtons/CnActionButtons.vue`
- [x] Implement: `headerActionAsLink`, each page hands its header surfaces the link form
- [x] Test: `tests/components/CnIndexPageHeaderActionHref.spec.js`, `tests/components/CnDetailPageHeaderActionHref.spec.js`, `tests/components/CnDashboardPageHeaderActionHref.spec.js`, `tests/components/CnReportsPageHeaderActionHref.spec.js`, `tests/components/CnActionsBarLinks.spec.js`
