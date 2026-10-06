# Tasks: table-header-sort-and-filter

## Implementation Tasks

### Task 1: Backed columns sort by default
- **spec_ref**: `openspec/changes/table-header-sort-and-filter/specs/cn-data-table/spec.md#requirement-every-backed-column-sorts-by-default`
- **files**: `src/utils/columnFilters.js`, `src/components/CnDataTable/CnDataTable.vue`, `tests/utils/columnFilters.spec.js`, `tests/components/CnDataTableHeaderFilter.spec.js`
- [x] Implement
- [x] Test

### Task 2: Header filter panel
- **spec_ref**: `openspec/changes/table-header-sort-and-filter/specs/cn-data-table/spec.md#requirement-every-backed-column-filters-from-its-header`
- **files**: `src/components/CnDataTable/CnColumnFilterPopover.vue`, `src/components/CnDataTable/CnDataTable.vue`, `src/css/table.css`, `tests/components/CnDataTableHeaderFilter.spec.js`
- [x] Implement
- [x] Test

### Task 3: Same query language and state as the sidebar
- **spec_ref**: `openspec/changes/table-header-sort-and-filter/specs/cn-data-table/spec.md#requirement-a-header-filter-speaks-the-sidebars-query-language`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnIndexPageHeaderFilters.spec.js`, `l10n/en.json`, `l10n/nl.json`, `docs/components/cn-data-table.md`
- [x] Implement
- [x] Test
