# Tasks: form-field-options-from

- [x] 1.1 The shared reader: source, row to option, load, filter
  - Files: src/utils/optionsFrom.js
  - Test: tests/components/CnFormFieldOptionsFrom.spec.js
- [x] 1.2 fieldsFromSchema reads x-options-from and draws the field as a select
  - Files: src/utils/schema.js
  - Test: tests/components/CnFormFieldOptionsFrom.spec.js
- [x] 1.3 CnFormDialog offers, stores and labels the options
  - Files: src/components/CnFormDialog/CnFormDialog.vue
  - Test: tests/components/CnFormFieldOptionsFrom.spec.js
- [x] 1.4 CnAdvancedFormDialog's cell does the same
  - Files: src/components/CnAdvancedFormDialog/CnPropertyValueCell.vue, src/components/CnAdvancedFormDialog/CnPropertiesTab.vue, src/components/CnAdvancedFormDialog/CnAdvancedFormDialog.vue
  - Test: tests/components/CnFormFieldOptionsFrom.spec.js
- [x] 1.5 Manifest schema 2.130.0 declares optionsFrom on a field override
  - Files: src/schemas/app-manifest-v2.schema.json, tests/schemas/app-manifest-v2.schema.hashes.json
  - Test: tests/components/CnFormFieldOptionsFrom.spec.js
