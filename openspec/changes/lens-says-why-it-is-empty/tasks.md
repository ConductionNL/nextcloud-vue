# Tasks: lens-says-why-it-is-empty

> A personal lens that cannot answer says why (ADR-032 `kind: code`).
> Backend: openregister#4514 `read-history-on-audit-trail`.

## Implementation tasks

### Task 1: Read the lens report
- **spec_ref**: `openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-a-list-response-carries-the-report-of-the-lenses-it-was-asked-for`
- **files**: `src/utils/lensAvailability.js`, `src/store/useObjectStore.js`, `src/composables/useListView.js`, `tests/utils/lensAvailability.spec.js`, `tests/store/useObjectStoreLenses.spec.js`
- **acceptance_criteria**:
  - `readLensReports(body)` returns `@self.lenses` or `{}`
  - `fetchCollection` writes `lenses[type]` with the rows, `{}` without a report
  - `useListView` exposes `lenses`
- [x] Implement
- [x] Test

### Task 2: The index page says why
- **spec_ref**: `openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-an-unavailable-lens-explains-its-empty-page`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnIndexPageLensReason.spec.js`
- **acceptance_criteria**:
  - Empty-state title is the reason text for each of the three reasons
  - No report, `available: true` or an unknown reason keeps `emptyText`
  - `lenses` prop for consumer-managed mode, `lensReasonTexts` overrides
- [x] Implement
- [x] Test

### Task 3: The object-table widget says why
- **spec_ref**: `openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-an-unavailable-lens-explains-its-empty-page`
- **files**: `src/components/CnDataTable/CnDataTable.vue`, `src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue`, `tests/components/CnDataTableLensReason.spec.js`
- **acceptance_criteria**:
  - Self-fetch keeps the response's report; the empty row shows the text
  - `lensReasonTexts` forwarded by the widget
- [x] Implement
- [x] Test

### Task 4: Copy and docs
- **spec_ref**: `openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-an-unavailable-lens-explains-its-empty-page`
- **files**: `l10n/en.json`, `l10n/nl.json`, `src/components/CnIndexPage/CnIndexPage.md`, `src/components/CnDataTable/CnDataTable.md`, `CHANGELOG.md`
- [x] Implement
