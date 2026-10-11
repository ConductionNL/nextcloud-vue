# Tasks: screens-table-footer-and-system-dates-parity

## Implementation Tasks

### Task 1: The count reads in the user's language
- **spec_ref**: `openspec/changes/screens-table-footer-and-system-dates-parity/specs/index-list-board-look/spec.md#requirement-the-count-reads-in-the-users-language`
- **files**: `l10n/en.json`, `l10n/nl.json`, `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: the two count strings in the catalogues; the default count line through `t()`
- [x] Test: default through `t()`, page template as written, catalogue entries (`tests/components/CnIndexPageCountTranslated.spec.js`)

### Task 2: A system date can be a column
- **spec_ref**: `openspec/changes/screens-table-footer-and-system-dates-parity/specs/index-list-board-look/spec.md#requirement-a-system-date-can-be-a-column`
- **files**: `src/components/CnDataTable/CnDataTable.vue`
- [x] Implement: `@self` date keys render as date-time in `columnProperty`
- [x] Test: value from `@self`, date-time format with and without a schema, own format wins, other keys unchanged, kept on an index page (`tests/components/CnDataTableSystemDates.spec.js`)

### Task 3: Documentation
- **files**: `docs/components/cn-data-table.md`
- [x] The `@self` date keys in the columns section
