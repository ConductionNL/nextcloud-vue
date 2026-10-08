# Tasks: form-field-property-source

> Registry-backed form field over integriq `registry-field-source` (ADR-032 `kind: code`).

## Implementation tasks

### Task 1: Descriptor and widget choice
- **spec_ref**: `openspec/changes/form-field-property-source/specs/form-property-source-field/spec.md#requirement-a-declared-property-renders-as-a-registry-type-ahead`
- **files**: `src/utils/schema.js`, `tests/utils/schema.propertySource.spec.js`
- **acceptance_criteria**:
  - `propertySource: {provider, mode, config}` on the descriptor, defaults `live` and `{}`
  - Widget `property-source` unless an override names another widget
  - JSDoc return type updated
- [ ] Implement
- [ ] Test

### Task 2: CnPropertySourceField
- **spec_ref**: `openspec/changes/form-field-property-source/specs/form-property-source-field/spec.md#requirement-without-a-working-lookup-the-field-is-a-plain-text-field-that-saves`
- **files**: `src/components/CnPropertySourceField/CnPropertySourceField.vue`, `index.js`, `CnPropertySourceField.md`, `src/components/index.js`, `tests/components/CnPropertySourceField.spec.js`
- **acceptance_criteria**:
  - Debounced suggest from 3 characters; `NcSelect` with `inputLabel`
  - Resolve before the value is set; emits `resolved` with `{value, provenance}`
  - Provenance line; plain text fallback with a reason for every case in design D5 and D6
- [ ] Implement
- [ ] Test

### Task 3: Fill map and replace prompt in CnFormDialog
- **spec_ref**: `openspec/changes/form-field-property-source/specs/form-property-source-field/spec.md#requirement-a-pick-fills-empty-sibling-fields-and-asks-before-replacing`
- **files**: `src/utils/propertySourceFill.js`, `src/components/CnFormDialog/CnFormDialog.vue`, `src/dialogs/CnReplaceValuesDialog.vue`, `tests/utils/propertySourceFill.spec.js`, `tests/components/CnFormDialogPropertySource.spec.js`, CnFormDialog reference docs
- **acceptance_criteria**:
  - Paths with dots, `[n]` and `=` literals; dotted targets
  - Empty targets filled; differing filled targets listed in one dialog; decline keeps them
  - Mode `live` fills nothing; no resolve on a later edit in mode `default`
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
