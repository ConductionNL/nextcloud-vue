# Tasks: object-list-create-with-initial-data

> `CnObjectListWidget.openCreate` passes register and initial data (ADR-032 `kind: code`).
> Checkbox budget: 2 tasks × 2 = 4 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Register and filter-derived initial data
- **spec_ref**: `openspec/changes/object-list-create-with-initial-data/specs/cn-workspace-context-widgets/spec.md#requirement-cnobjectlistwidget-opens-its-create-form-in-context`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`, `src/components/CnObjectListWidget/__tests__/CnObjectListWidgetCreate.spec.js`
- **acceptance_criteria**:
  - The mounted dialog receives `register` and `initialData`
  - Tokens are resolved and operator or non-schema keys are dropped
  - A `$ref` field renders as a picker, not a text box, asserted on the rendered form
  - JSDoc and the component reference doc updated
- [ ] Implement
- [ ] Test

### Task 2: Locked parent field and create defaults
- **spec_ref**: `openspec/changes/object-list-create-with-initial-data/specs/cn-workspace-context-widgets/spec.md#requirement-a-prefilled-parent-stays-put`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`, `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnObjectListWidget/__tests__/CnObjectListWidgetCreate.spec.js`
- **acceptance_criteria**:
  - `lockFilterFields` (default true) renders the prefilled reference read-only with its label
  - `createDefaults` merges over the filter-derived data
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
