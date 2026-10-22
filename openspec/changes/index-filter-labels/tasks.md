# Tasks: index-filter-labels

> Named filters and one chip per range on the Active line (ADR-032 `kind: code`).

## Implementation tasks

### Task 1: A page names its filters
- **spec_ref**: `openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-a-page-names-its-filters`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnIndexFilterLabels.spec.js`
- **acceptance_criteria**:
  - `filterLabels` names the field and each value, through the app's translate
  - A named source falls back to its sidebar field's title and `enumLabels`
- [x] Implement
- [x] Test

### Task 2: A range is one chip
- **spec_ref**: `openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-a-range-is-one-chip`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/utils/filterRangeLabel.js`, `l10n/nl.json`, `tests/components/CnIndexFilterLabels.spec.js`, `tests/utils/filterRangeLabel.spec.js`
- **acceptance_criteria**:
  - `{from, to}` and `key[gte]`/`key[lte]` give one chip with locale dates, the month once when shared
  - Removing it clears both ends
- [x] Implement
- [x] Test
