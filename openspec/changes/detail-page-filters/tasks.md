# Tasks: detail-page-filters

### Task 1: A detail page can draw page filters that its widgets read
- **spec_ref**: `openspec/changes/detail-page-filters/specs/detail-page/spec.md#requirement-a-detail-page-can-draw-page-filters-that-its-widgets-read`
- **files**: `src/mixins/pageFilters.js`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnDetailPage/CnDetailPage.vue`, `src/css/detail-page.css`
- [x] Implement: the shared mixin; CnDashboardPage on it; CnDetailPage `pageFilters`, the provided workspace context and the filter row in the band
- [x] Test: `tests/components/CnDetailPagePageFilters.spec.js`, the existing dashboard page-filter tests
