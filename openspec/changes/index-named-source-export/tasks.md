# Tasks: index-named-source-export

### Task 1: A named-source list downloads its rows
- **spec_ref**: `openspec/changes/index-named-source-export/specs/index-named-source-export/spec.md#requirement-a-named-source-list-downloads-its-rows`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnIndexPage/rowsToCsv.js`
- [x] Implement: `headerExportAvailable` keeps Export on a named source; `downloadNamedRows` builds and downloads the CSV
- [x] Test: `tests/components/CnIndexPageHeaderExportSource.spec.js`, `tests/components/rowsToCsv.spec.js`
