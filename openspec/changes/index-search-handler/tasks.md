# Tasks: index-search-handler

### Task 1: Read the search through a registered handler
- **spec_ref**: `openspec/changes/index-search-handler/specs/index-page/spec.md#requirement-a-registered-handler-can-read-the-search-before-it-is-sent`
- **files**: `src/composables/useListView.js`, `src/components/CnIndexPage/useSelfFetchList.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `src/components/CnIndexPage/CnIndexPage.md`
- [x] Implement: `searchInterpreter` in `useListView`, `searchHandler` prop and note on `CnIndexPage`, schema key (2.170.0)
- [x] Test: `tests/composables/useListViewSearchInterpreter.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`
