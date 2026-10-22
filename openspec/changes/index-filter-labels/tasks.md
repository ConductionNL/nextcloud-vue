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

### Task 3: Several values read as a list
- **spec_ref**: `openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-several-values-read-as-a-list`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/utils/filterRangeLabel.js`, `tests/utils/filterRangeLabel.spec.js`, `tests/components/CnIndexFilterLabels.spec.js`
- **acceptance_criteria**:
  - Two values read "a en b" in Dutch, three "a, b en c"
  - Without `Intl.ListFormat` the names join with ", "
- [x] Implement
- [x] Test

### Task 4: A range from today is named in words
- **spec_ref**: `openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-a-range-from-today-is-named-in-words`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/utils/filterRangeLabel.js`, `l10n/en.json`, `l10n/nl.json`, `tests/utils/filterRangeLabel.spec.js`, `tests/components/CnIndexFilterLabels.spec.js`
- **acceptance_criteria**:
  - today, within n days and this week, from dates or `@today` tokens
  - only with `relative: true`; any other range reads as dates
- [x] Implement
- [x] Test

