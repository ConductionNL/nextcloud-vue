# Tasks: screens-relative-dates

### Task 1: The relative date helper
- **spec_ref**: `openspec/changes/screens-relative-dates/specs/relative-dates/spec.md#requirement-a-relative-date-reads-today-yesterday-then-a-short-date`
- **files**: `src/utils/boardDate.js`, `l10n/en.json`, `l10n/nl.json`, `tests/utils/boardDate.spec.js`
- [x] Implement
- [x] Test

### Task 2: Column widget, template tokens and formatter
- **spec_ref**: `openspec/changes/screens-relative-dates/specs/relative-dates/spec.md#requirement-a-date-column-and-a-template-can-read-relatively`
- **files**: `src/components/CnCellRenderer/CnCellRenderer.vue`, `src/utils/fillTemplate.js`, `src/utils/builtInFormatters.js`, `tests/utils/fillTemplate.spec.js`, `tests/utils/builtInFormatters.spec.js`, `tests/components/CnCellRenderer.spec.js`, `docs/components/cn-cell-renderer.md`, `docs/migrating-to-manifest.md`
- [x] Implement
- [x] Test
- [x] e2e harness page `?l6=relative-dates` and `e2e/relative-dates.e2e.js`
