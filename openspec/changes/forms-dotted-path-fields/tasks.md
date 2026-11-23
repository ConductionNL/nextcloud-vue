# Tasks: forms-dotted-path-fields

- [x] 1.1 fieldsFromSchema builds dotted fields and keeps an object a field override gives a widget
  - Files: src/utils/schema.js
  - Test: tests/components/CnFormDottedFields.spec.js
- [x] 1.2 Read a dotted value out of its object and fold it back in
  - Files: src/utils/dottedFields.js
  - Test: tests/components/CnFormDottedFields.spec.js
- [x] 1.3 CnFormDialog and CnObjectDataWidget use them
  - Files: src/components/CnFormDialog/CnFormDialog.vue, src/components/CnObjectDataWidget/CnObjectDataWidget.vue
  - Test: tests/components/CnFormDottedFields.spec.js
