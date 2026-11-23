# Tasks: list-counts-in-one-request

### Task 1: List counts go out as one request
- **spec_ref**: `openspec/changes/list-counts-in-one-request/specs/index-page/spec.md#requirement-list-counts-go-out-as-one-request`
- **files**: `src/utils/fetchFilterCounts.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnDetailPage/CnDetailPage.vue`
- [x] Implement: `fetchListTotals()` and `parsePhpQuery()`; fetchFilterCounts, CnIndexPage page-tab and header-meta counts, CnDetailPage header-meta and pill counts use it
- [x] Test: `tests/utils/fetchFilterCounts.spec.js`; component specs that counted the GET requests answer the batch request
