# Tasks: sidebar-sort-source

- [x] 1.1 Rows, search, filters, paging and annotation over a source's rows
  - Files: src/utils/sortSourceRows.js
  - Test: tests/utils/sortSourceRows.spec.js
- [x] 1.2 The Sort section offers an order of its own, chosen by its value
  - Files: src/components/CnIndexSidebar/CnIndexSidebar.vue
  - Test: tests/components/CnIndexPageSidebarSort.spec.js
- [x] 1.3 CnIndexPage chooses, loads, shows, leaves and falls back from a source option; selectSortOption(value)
  - Files: src/components/CnIndexPage/CnIndexPage.vue, src/css/index-page.css
  - Test: tests/components/CnIndexPageSortSource.spec.js
- [x] 1.4 Manifest schema 2.131.0 declares sortSelectOptions with source
  - Files: src/schemas/app-manifest-v2.schema.json, tests/schemas/app-manifest-v2.schema.hashes.json
  - Test: tests/schemas/app-manifest-v2.schema.spec.js
- [x] 1.5 Docs: CnIndexPage.md and docs/components/cn-index-page.md
