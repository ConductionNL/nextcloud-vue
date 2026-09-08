# Tasks: form-widgets-duration-and-subobject-table

> Two form widgets in `CnFormDialog` (ADR-032 `kind: code`).
> Checkbox budget: 3 tasks × 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Duration widget
- **spec_ref**: `openspec/changes/form-widgets-duration-and-subobject-table/specs/dialog-system/spec.md#requirement-req-dg-020-duration-widget`
- **files**: `src/components/CnFormDialog/widgets/CnDurationField.vue`, `src/components/CnFormDialog/resolveFieldWidget.js`, `src/components/CnFormDialog/__tests__/CnDurationField.spec.js`
- **acceptance_criteria**:
  - `format: duration` selects the widget; a field override can name it
  - Round trip for each unit; mixed values are not rounded
  - `inputLabel` on the number input and the unit select
- [ ] Implement
- [ ] Test

### Task 2: Sub-objects widget
- **spec_ref**: `openspec/changes/form-widgets-duration-and-subobject-table/specs/dialog-system/spec.md#requirement-req-dg-021-sub-objects-widget`
- **files**: `src/components/CnFormDialog/widgets/CnSubObjectsField.vue`, `src/components/CnFormDialog/resolveFieldWidget.js`, `src/components/CnFormDialog/__tests__/CnSubObjectsField.spec.js`
- **acceptance_criteria**:
  - Add, edit through a nested dialog, duplicate, move, remove all write the array
  - Per-row required validation blocks Save with the row number
  - `order` is rewritten on reorder
- [ ] Implement
- [ ] Test

### Task 3: Docs, exports and accessibility pass
- **spec_ref**: `openspec/changes/form-widgets-duration-and-subobject-table/specs/dialog-system/spec.md#requirement-req-dg-021-sub-objects-widget`
- **files**: `src/components/index.js`, `docs/components/CnFormDialog.md`, `src/components/CnFormDialog/__tests__/CnSubObjectsField.spec.js`
- **acceptance_criteria**:
  - Both widgets exported from the barrel and listed in the widget table of the reference doc
  - Move up and Move down reachable by keyboard
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
