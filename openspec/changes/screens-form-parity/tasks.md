# Tasks: screens-form-parity

## Implementation Tasks

### Task 1: The label sits above the input
- **spec_ref**: `openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md#requirement-the-label-sits-above-the-input`
- **files**: `src/components/CnFormField/CnFormField.vue` (new, internal wrapper: label, hint, error, control slot), `src/css/form-field.css` (new), `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnFormPage/CnFormPage.vue`
- [x] Implement: `CnFormField` (the label and error head), `labelOutside` and an id on the Nextcloud controls in the board look, field tokens in `src/css/form-field.css`. Applied to CnFormDialog and CnFormPage; it wraps the label and error only, the control and hint stay where the form drew them. Widgets that draw their own label (switch, checkbox, file, duration, child records, sub objects, property source, reference widget) keep it
- [ ] Test: label `for` matches the control id; sizes in a browser — partly run: the `for`/`id` match is tested for CnFormPage and CnFormDialog; the 14px, 40px and 6px sizes are only asserted as CSS, not measured in a browser (no running instance)

### Task 2: Optional fields are marked, required fields are not
- **spec_ref**: `openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md#requirement-optional-fields-are-marked-required-fields-are-not`
- **files**: `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnTabbedFormDialog/CnTabbedFormDialog.vue`, `src/components/CnRichSubmitDialog/CnRichSubmitDialog.vue`, `src/components/CnAdvancedFormDialog/CnPropertiesTab.vue`, `src/components/CnFormPage/CnFormPage.vue`
- [x] Implement: `optionalLabel`, `aria-required`, the asterisk only in the Nextcloud look (22 label sites in CnFormDialog, the 3 in CnRichSubmitDialog, the properties tab indicator, CnFormPage shows "(optional)"; CnTabbedFormDialog renders fields through slots and has no asterisk)
- [x] Test: no "*" in the board look, still there in the Nextcloud look

### Task 3: Hint under the input, error above it
- **spec_ref**: `openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md#requirement-hint-under-the-input-error-above-it`
- **files**: `src/components/CnFormField/CnFormField.vue`, `src/css/form-field.css`
- [ ] Implement: hint and error placement, `aria-invalid`, `aria-describedby` order in both looks — partly built: done for text, number, textarea and password controls (CnFormDialog and CnFormPage). Not done for NcSelect, NcDateTimePickerNative and the other composite widgets: NcSelect forwards no attributes to its input, so the wiring needs a change in the select wrapper
- [ ] Test: attribute order; the error edge and border in the board look — attribute order is tested; the 4px edge and 2px border are only asserted as CSS, not measured in a browser

### Task 4: A failed submit shows an error summary
- **spec_ref**: `openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md#requirement-a-failed-submit-shows-an-error-summary`
- **files**: `src/components/CnFormErrorSummary/CnFormErrorSummary.vue` (new), `src/components/CnFormPage/CnFormPage.vue`, `e2e/screens-form-parity.e2e.js`
- [x] Implement: summary, focus on render, links that focus their control
- [x] Test: focus moves, singular and plural heading, axe clean (`tests/components/CnFormParity.spec.js`, `tests/a11y/CnWizardParity.a11y.spec.js`; `e2e/screens-form-parity.e2e.js` not written, no running instance)

### Task 5: Short fields can pair up
- **spec_ref**: `openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md#requirement-short-fields-can-pair-up`
- **files**: `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnFormPage/CnFormPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `width: "half"` on a form field, consecutive half fields share the grid (CnFormDialog, CnFormPage). The manifest schema is left alone on purpose: `config.fields[]` items already accept extra keys (`additionalProperties: true`), and a typed property would bump the schema version in parallel with other lanes
- [ ] Test: one row at 640px, stacked at 390px — not run: needs layout. The class is tested in both looks; the grid (`repeat(auto-fit, minmax(220px, 1fr))`) is in `form-field.css`

### Task 6: A public form says what optional means
- **spec_ref**: `openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md#requirement-a-public-form-says-what-optional-means`
- **files**: `src/components/CnFormPage/CnFormPage.vue`
- [x] Implement: the sentence, its label prop and the switch
- [x] Test: shown once with a required field, absent without one

### Task 7: Documentation
- **files**: `docs/components/cn-form-dialog.md`, `docs/components/cn-form-page.md`, `docs/design-tokens/index.md`
- [x] JSDoc on the new props; the field tokens and the citizen values portaliq sets (`docs/components/cn-form-dialog.md`, `cn-form-page.md`, `docs/design-tokens/index.md`)
