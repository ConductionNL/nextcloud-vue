# Tasks: screens-form-parity

## Implementation Tasks

### Task 1: The label sits above the input
- **spec_ref**: `openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md#requirement-the-label-sits-above-the-input`
- **files**: `src/components/CnFormField/CnFormField.vue` (new, internal wrapper: label, hint, error, control slot), `src/css/form-field.css` (new), `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnFormPage/CnFormPage.vue`
- [ ] Implement: shared wrapper, `labelOutside` on the Nextcloud controls in the board look, field tokens
- [ ] Test: label `for` matches the control id; sizes in a browser

### Task 2: Optional fields are marked, required fields are not
- **spec_ref**: `openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md#requirement-optional-fields-are-marked-required-fields-are-not`
- **files**: `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnTabbedFormDialog/CnTabbedFormDialog.vue`, `src/components/CnRichSubmitDialog/CnRichSubmitDialog.vue`, `src/components/CnAdvancedFormDialog/CnPropertiesTab.vue`, `src/components/CnFormPage/CnFormPage.vue`
- [ ] Implement: `optionalLabel`, `aria-required`, the asterisk only in the Nextcloud look (all 15 sites)
- [ ] Test: no "*" in the board look, still there in the Nextcloud look

### Task 3: Hint under the input, error above it
- **spec_ref**: `openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md#requirement-hint-under-the-input-error-above-it`
- **files**: `src/components/CnFormField/CnFormField.vue`, `src/css/form-field.css`
- [ ] Implement: hint and error placement, `aria-invalid`, `aria-describedby` order in both looks
- [ ] Test: attribute order; the error edge and border in the board look

### Task 4: A failed submit shows an error summary
- **spec_ref**: `openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md#requirement-a-failed-submit-shows-an-error-summary`
- **files**: `src/components/CnFormErrorSummary/CnFormErrorSummary.vue` (new), `src/components/CnFormPage/CnFormPage.vue`, `e2e/screens-form-parity.e2e.js`
- [ ] Implement: summary, focus on render, links that focus their control
- [ ] Test: focus moves, singular and plural heading, axe clean

### Task 5: Short fields can pair up
- **spec_ref**: `openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md#requirement-short-fields-can-pair-up`
- **files**: `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnFormPage/CnFormPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [ ] Implement: `width: "half"` on formField, grouping of consecutive half fields
- [ ] Test: one row at 640px, stacked at 390px

### Task 6: A public form says what optional means
- **spec_ref**: `openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md#requirement-a-public-form-says-what-optional-means`
- **files**: `src/components/CnFormPage/CnFormPage.vue`
- [ ] Implement: the sentence, its label prop and the switch
- [ ] Test: shown once with a required field, absent without one

### Task 7: Documentation
- **files**: `docs/components/cn-form-dialog.md`, `docs/components/cn-form-page.md`, `docs/design-tokens/index.md`
- [ ] JSDoc on the new props; the field tokens and the citizen values portaliq sets
