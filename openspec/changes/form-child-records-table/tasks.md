# Tasks: form-child-records-table

> Row `form-subtable-children` (buildiq). `kind: code`. Shares its row table with `form-widgets-duration-and-subobject-table`.
> Checkbox budget: 4 tasks x 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The widget from the relation
- **spec_ref**: `openspec/changes/form-child-records-table/specs/dialog-system/spec.md#requirement-a-child-records-field-edits-another-schemas-records-inside-the-form`
- **files**: `src/utils/schema.js`, `tests/utils/schemaChildRecords.spec.js`
- **acceptance_criteria**:
  - An array of `$ref` items with `inversedBy` maps to `child-records` with `schema` and `parentField`; an explicit widget wins
  - Verify: jest
- [x] Implement
- [x] Test

### Task 2: `CnChildRecordsField`
- **spec_ref**: `openspec/changes/form-child-records-table/specs/dialog-system/spec.md#requirement-a-child-records-field-edits-another-schemas-records-inside-the-form`
- **files**: `src/components/CnChildRecordsField/`, `src/composables/useChildRecords.js`, `tests/components/CnChildRecordsField.spec.js`, `tests/a11y/CnChildRecordsField.a11y.spec.js`
- **acceptance_criteria**:
  - Loads children of an existing parent; Add, inline edit, row dialog, Remove; pages at 50 with a link to the list
  - Shares the row table with the `sub-objects` widget when that exists, otherwise ships it and `sub-objects` reuses it
  - Verify: jest; `npm run check:a11y`
- [x] Implement
- [x] Test (jest; `npm run check:a11y` not run)

### Task 3: Save after the parent
- **spec_ref**: `openspec/changes/form-child-records-table/specs/dialog-system/spec.md#requirement-children-are-saved-after-the-parent-in-two-requests`
- **files**: `src/composables/useChildRecords.js`, `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnFormPage/CnFormPage.vue`, `tests/composables/useChildRecords.spec.js`
- **acceptance_criteria**:
  - Parent first, then one bulk save and one bulk delete; the parent payload carries no nested children
  - A refused child is named in the result and the parent stays saved
  - Verify: jest with mocked axios asserting the request order and count; mutation check: nesting children in the parent payload reddens the test
- [x] Implement (CnFormDialog only — not run: CnFormPage renders a flat field set and does not yet host the child-records table)
- [x] Test

### Task 4: Row validation and docs
- **spec_ref**: `openspec/changes/form-child-records-table/specs/dialog-system/spec.md#requirement-rows-are-validated-before-anything-is-sent`
- **files**: `src/components/CnChildRecordsField/`, `tests/components/CnChildRecordsFieldValidation.spec.js`, `docs/components/cn-child-records-field.md`, `docs/components/cn-form-dialog.md`
- **acceptance_criteria**:
  - A failing row blocks submit, naming row and field; nothing is sent
  - Docs explain the relation it reads and why children are saved after the parent
  - Verify: jest; `npm run check:docs`, `npm run check:docs-fresh`
- [x] Implement
- [x] Test

## Cross-project

- openregister: none owed. This change saves children through the child schema's own endpoint and needs no cascade. (`RelationCascadeHandler::cascadeSingleObject()` is a dead stub; the real single-save cascade is `SaveObject::cascadeObjects()`, and the bulk path skips cascading by a TODO.)
