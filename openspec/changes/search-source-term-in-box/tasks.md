# Tasks: search-source-term-in-box

### Task 1: The search page keeps its term in the search box
- **spec_ref**: `openspec/changes/search-source-term-in-box/specs/index-page/spec.md#requirement-the-search-page-keeps-its-term-in-the-search-box`
- **files**: `src/composables/indexSources.js`, `src/components/CnIndexPage/useNamedSource.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: searchParam, initialSearch and searchChip on the search source; the seed; the chip, its removal and Clear all
- [x] Test: `tests/composables/indexSourcesSearchBox.spec.js`
