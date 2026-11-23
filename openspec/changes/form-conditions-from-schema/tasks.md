# Tasks: form-conditions-from-schema

> Row `plat-field-conditions` (pipelinq), with the stackiq, shillinq and portaliq halves. `kind: code`.
> Checkbox budget: 7 tasks x 2 = 14 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: One predicate for both forms
- **spec_ref**: `openspec/changes/form-conditions-from-schema/specs/dialog-system/spec.md#requirement-a-property-shows-or-hides-itself-by-another-fields-value`
- **files**: `src/utils/fieldCondition.js`, `src/components/CnFormDialog/CnFormDialog.vue`, `tests/utils/fieldCondition.spec.js`
- **acceptance_criteria**:
  - The old condition shapes translate to the local predicate and every existing `fieldCondition` test still passes
  - A field hidden in the dialog is left out of the payload
  - Verify: jest
- [ ] Implement
- [ ] Test

### Task 2: Visible-when and required-when from the schema
- **spec_ref**: `openspec/changes/form-conditions-from-schema/specs/dialog-system/spec.md#requirement-a-property-is-required-by-another-fields-value`
- **files**: `src/utils/schema.js`, `src/components/CnFormPage/CnFormPage.vue`, `tests/utils/schemaConditions.spec.js`, `tests/components/CnFormDialogConditions.spec.js`
- **acceptance_criteria**:
  - `fieldsFromSchema` emits `visibleWhen` and `requiredWhen`; an `endpoint` or `source` from a schema is ignored with a warning
  - Required-when blocks sending while its condition holds, naming the field
  - Verify: jest; mutation check: dropping the schema mapping reddens the complaint scenario
- [ ] Implement
- [ ] Test

### Task 3: Dependent values
- **spec_ref**: `openspec/changes/form-conditions-from-schema/specs/dialog-system/spec.md#requirement-a-dependent-property-offers-only-the-allowed-values`
- **files**: `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnFormPage/CnFormPage.vue`, `tests/components/CnFormDialogDependentValues.spec.js`
- **acceptance_criteria**:
  - Options narrow to the `allowed` row; no row offers everything; a stale value is cleared
  - Verify: jest with the stackiq licence table as fixture
- [ ] Implement
- [ ] Test

### Task 4: Runtime required fields
- **spec_ref**: `openspec/changes/form-conditions-from-schema/specs/dialog-system/spec.md#requirement-a-host-adds-required-fields-at-runtime`
- **files**: `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnFormPage/CnFormPage.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnFormDialogRequiredFields.spec.js`
- **acceptance_criteria**:
  - `requiredFields` merges with `required` for marking and checking; `CnIndexPage` forwards `config.requiredFields`
  - Verify: jest; `npm run build:validators`
- [ ] Implement
- [ ] Test

### Task 5: Refusals under their fields
- **spec_ref**: `openspec/changes/form-conditions-from-schema/specs/dialog-system/spec.md#requirement-a-rule-refusal-lands-under-the-fields-it-names`
- **files**: `src/utils/errors.js`, `tests/utils/errors.spec.js`
- **acceptance_criteria**:
  - Entries with `properties` and `message` become field errors on each named property; others stay form-level
  - Verify: jest with a recorded OpenRegister refusal body
- [ ] Implement
- [ ] Test

### Task 6: Show when and Required when in the schema editor
- **spec_ref**: `openspec/changes/form-conditions-from-schema/specs/dialog-system/spec.md#requirement-an-administrator-sets-conditions-without-code`
- **files**: `src/components/CnSchemaFormDialog/CnSchemaPropertyActions.vue`, `tests/components/CnSchemaPropertyConditions.spec.js`, `tests/a11y/CnSchemaFormDialog.a11y.spec.js`
- **acceptance_criteria**:
  - Picking a property, operator and value writes the annotation; clearing removes the key
  - The controls carry `inputLabel` (hydra NcSelect gate)
  - Verify: jest; `npm run check:a11y`
- [ ] Implement
- [ ] Test

### Task 7: Root export and docs
- **spec_ref**: `openspec/changes/form-conditions-from-schema/specs/dialog-system/spec.md#requirement-the-local-predicate-is-exported-from-the-package-root`
- **files**: `src/index.js`, `tests/packaging/rootExports.spec.js`, `docs/components/cn-form-dialog.md`, `docs/components/cn-form-page.md`
- **acceptance_criteria**:
  - The root entry exports the two functions
  - Docs name both annotations, dependent values, `requiredFields`, and that enforcement of required-when is OpenRegister's
  - Verify: jest; `npm run check:public-safe`; `npm run check:docs`, `npm run check:docs-fresh`
- [ ] Implement
- [ ] Test

## Cross-project

- openregister: enforce `x-openregister-required-when` on save, in the shape of `DependentValueListener`. Listed for the openregister lane.
