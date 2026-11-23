# Tasks: sub-objects-editor

- [x] 1.1 CnSubObjectsField: newItem, itemLabel, emptyText, focus
  - Files: src/components/CnSubObjectsField/CnSubObjectsField.vue
  - Test: tests/components/CnSubObjectsEditor.spec.js
- [x] 1.2 pruneWhen on save and in validation
  - Files: src/utils/pruneRows.js, src/components/CnFormDialog/CnFormDialog.vue
  - Test: tests/components/CnSubObjectsEditor.spec.js
- [x] 1.3 widget object-switch, a switched-off object stays null
  - Files: src/components/CnFormDialog/CnFormDialog.vue, src/utils/dottedFields.js
  - Test: tests/components/CnSubObjectsEditor.spec.js
- [x] 1.4 optionsFrom falls back to text
  - Files: src/components/CnFormDialog/CnFormDialog.vue
  - Test: tests/components/CnSubObjectsEditor.spec.js
- [x] 1.5 Schema documents the override keys
  - Files: src/schemas/app-manifest-v2.schema.json, tests/schemas/app-manifest-v2.schema.hashes.json
  - Test: tests/schemas/app-manifest-v2.schema.spec.js
