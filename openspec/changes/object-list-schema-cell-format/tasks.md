# Tasks: object-list-schema-cell-format

### Task 1: A named column keeps the schema's format and enum labels
- **spec_ref**: `openspec/changes/object-list-schema-cell-format/specs/object-list/spec.md#requirement-a-named-column-keeps-the-schema-s-format-and-enum-labels`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`
- [x] Implement: schema format and enum labels on resolved columns; load the schema when a column needs it; share an in-flight schema request
- [x] Test: `tests/components/CnObjectListWidgetSchemaCells.spec.js`, `tests/components/CnObjectListWidgetColumnHeadings.spec.js`
