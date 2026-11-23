# Tasks: page-view-user-layouts

## Implementation Tasks

### Task 1: A user arranges each view for themselves
- **spec_ref**: `openspec/changes/page-view-user-layouts/specs/view-switch-containers/spec.md#requirement-a-user-arranges-each-view-for-themselves`
- **files**: `src/mixins/pageViews.js`, `src/store/plugins/dashboardLayouts.js`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnDetailPage/CnDetailPage.vue`
- [x] Implement
- [x] Test (`tests/components/CnPageViewsUserLayout.spec.js`)

### Task 2: Resetting a view restores its manifest layout
- **spec_ref**: `openspec/changes/page-view-user-layouts/specs/view-switch-containers/spec.md#requirement-resetting-a-view-restores-its-manifest-layout`
- **files**: `src/mixins/pageViews.js`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnDetailPage/CnDetailPage.vue`
- [x] Implement
- [x] Test

### Task 3: Docs
- **files**: `docs/components/cn-dashboard-page.md`, `docs/components/cn-detail-page.md`, `docs/store/plugins/dashboard-layouts.md`
- [x] Document `userLayout` for views and the reset
