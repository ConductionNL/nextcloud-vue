# Tasks: cell-labels-and-draft-indicator

## Implementation Tasks

### Task 1: Built-in cell widgets show an enum value by its label
- **spec_ref**: `openspec/changes/cell-labels-and-draft-indicator/specs/cell-labels-and-draft-indicator/spec.md#requirement-a-built-in-cell-widget-shows-an-enum-value-by-its-label`
- **files**: `src/components/CnCellRenderer/CnCellRenderer.vue`, `tests/components/CnCellRendererWidgetLabels.spec.js`, `e2e/cell-labels.e2e.js`
- [x] Implement
- [x] Test

### Task 2: The boolean check mark uses the success text colour
- **spec_ref**: `openspec/changes/cell-labels-and-draft-indicator/specs/cell-labels-and-draft-indicator/spec.md#requirement-the-boolean-check-mark-is-drawn-in-the-success-text-colour`
- **files**: `src/components/CnCellRenderer/CnCellRenderer.vue`, `e2e/cell-labels.e2e.js`, `e2e/harness/CellLabelsHarness.vue`
- [x] Implement
- [x] Test

### Task 3: The draft indicator never reads as a server save after a failed save
- **spec_ref**: `openspec/changes/cell-labels-and-draft-indicator/specs/cell-labels-and-draft-indicator/spec.md#requirement-the-draft-indicator-never-reads-as-a-server-save-after-a-failed-save`
- **files**: `src/composables/useFormDraft.js`, `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnFormPage/CnFormPage.vue`, `l10n/en.json`, `l10n/nl.json`, `tests/components/CnFormDialogDraft.spec.js`, `tests/components/CnFormPageDraft.spec.js`
- [x] Implement
- [x] Test
