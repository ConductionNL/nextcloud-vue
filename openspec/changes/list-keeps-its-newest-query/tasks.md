# Tasks: list-keeps-its-newest-query

### Task 1: The newest list query wins
- **spec_ref**: `openspec/changes/list-keeps-its-newest-query/specs/list-keeps-its-newest-query/spec.md#requirement-the-newest-list-query-decides-what-the-list-shows`
- **files**: `src/store/useObjectStore.js`
- [x] Implement: drop a `fetchCollection` response once a newer one for the type started
- [x] Test: `tests/store/useObjectStoreNewestQuery.spec.js`

### Task 2: A live refetch repeats the newest query
- **spec_ref**: `openspec/changes/list-keeps-its-newest-query/specs/list-keeps-its-newest-query/spec.md#requirement-a-live-refetch-repeats-the-newest-query`
- **files**: `src/store/plugins/liveUpdates.js`
- [x] Implement: record params when the fetch starts, skip `append` pages
- [x] Test: `tests/store/useObjectStoreNewestQuery.spec.js`
