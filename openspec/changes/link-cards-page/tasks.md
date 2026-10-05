# Tasks: link-cards-page

## Implementation Tasks

### Task 1: CnLinkCardsPage and the `links` page type
- **spec_ref**: `openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-a-links-page-renders-grouped-link-cards`
- **files**: `src/components/CnLinkCardsPage/`, `src/components/CnPageRenderer/pageTypes.js`, `src/schemas/app-manifest-v2.schema.json`, docs, tests
- [x] Implement
- [x] Test

### Task 2: Export every renderer page component
- **spec_ref**: `openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-every-page-component-the-renderer-mounts-is-exported`
- **files**: `src/index.js`, `tests/packaging/`
- [x] Implement
- [x] Test

### Task 3: Detail title wraps to two lines
- **spec_ref**: `openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-a-long-detail-title-wraps-before-it-truncates`
- **files**: `src/css/detail-page.css`, `src/components/CnDetailPage/CnDetailPage.vue`
- [x] Implement
- [x] Test

### Task 4: The nav active state respects query
- **spec_ref**: `openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-menu-entries-that-differ-in-query`
- **files**: `src/components/CnAppNav/CnAppNav.vue`, `tests/components/CnAppNavActiveQuery.spec.js`
- [x] Implement
- [x] Test

### Task 5: Filter operators in bracket form, plain header padding
- **spec_ref**: `openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-a-filter-operator-is-serialised-in-bracket-form`
- **files**: `src/utils/headers.js`, `src/components/CnBannerWidget/CnBannerWidget.vue`, `src/components/CnHeaderWidget/CnHeaderWidget.vue`
- [x] Implement
- [x] Test
