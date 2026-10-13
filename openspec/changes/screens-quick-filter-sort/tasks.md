# Tasks: screens-quick-filter-sort

### Task 1: A lens orders the list
- **spec_ref**: `openspec/changes/screens-quick-filter-sort/specs/index-page/spec.md#requirement-a-quick-filter-can-set-its-own-order`
- **files**: `src/components/CnIndexPage/useSelfFetchList.js`, `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: `quickFilterSortKeys`, initial and on-switch order
- [x] Test: `tests/components/CnIndexPageQuickFilterSort.spec.js`; e2e `e2e/l8-quick-filter-sort.e2e.js` (fails without the change)
