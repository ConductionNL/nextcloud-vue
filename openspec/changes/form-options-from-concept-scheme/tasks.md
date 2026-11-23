# Tasks: form-options-from-concept-scheme

> Sibling half of buildiq `data-field-types-and-choice-lists` (design,
> Risks). Rows `data-choice-lists`, `data-field-types` (buildiq).
> `kind: code`.
> Checkbox budget: 4 tasks x 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The coded field tag
- **spec_ref**: `openspec/changes/form-options-from-concept-scheme/specs/dialog-system/spec.md#requirement-a-property-bound-to-a-concept-scheme-becomes-a-coded-select-field`
- **files**: `src/utils/schema.js`, `tests/utils/schemaCodeList.spec.js`
- **acceptance_criteria**:
  - Both spellings, alone and as array items, give `select` or `multiselect` and the `codeList` tag; unbound properties are unchanged
  - Verify: jest; mutation check: dropping the `items` branch reddens the array test
- [x] Implement
- [x] Test

### Task 2: Options from OpenRegister
- **spec_ref**: `openspec/changes/form-options-from-concept-scheme/specs/dialog-system/spec.md#requirement-a-coded-field-offers-the-options-openregister-serves`
- **files**: `src/components/CnFormDialog/CnFormDialog.vue`, `tests/components/CnFormDialogCodeList.spec.js`
- **acceptance_criteria**:
  - The request carries `schema`, `property` and `language`; options keep OpenRegister's order; the stored value is the option's `value` string (array for a multiselect)
  - A failed or empty answer falls back to a text input with the message
  - Verify: jest with a mocked axios asserting the URL and parameters
- [x] Implement
- [x] Test

### Task 3: Retired values and context
- **spec_ref**: `openspec/changes/form-options-from-concept-scheme/specs/dialog-system/spec.md#requirement-a-value-no-longer-offered-still-shows-by-its-label`
- **files**: `src/components/CnFormDialog/CnFormDialog.vue`, `tests/components/CnFormDialogCodeListRetired.spec.js`
- **acceptance_criteria**:
  - A held value missing from the options resolves through the concept route (uri or notation per `store`) and shows with "no longer offered"
  - A `contextProperty` change requests again with `context`; a no longer matching choice is kept and marked
  - Verify: jest; mutation check: clearing the value on a context change reddens the keep test
- [x] Implement
- [x] Test

### Task 4: Docs and an end-to-end run
- **spec_ref**: `openspec/changes/form-options-from-concept-scheme/specs/dialog-system/spec.md#requirement-a-coded-field-offers-the-options-openregister-serves`
- **files**: `docs/components/cn-form-dialog.md`, `docs/utilities/fields-from-schema.md`, `e2e/form-concept-options.e2e.js`
- **acceptance_criteria**:
  - Docs show both spellings and the fallback
  - Against a harness schema bound to a seeded scheme, the dialog lists the options and saves a chosen uri
  - Verify: `npm run check:docs`, `npm run check:docs-fresh`; `npm run test:e2e -- form-concept-options`
- [x] Implement
- [ ] Test — not run: needs a harness schema bound to a seeded scheme and `npm run test:e2e`
