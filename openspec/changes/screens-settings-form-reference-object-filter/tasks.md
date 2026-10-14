# Tasks: screens-settings-form-reference-object-filter

### Task 1: Record tokens in a reference field's filter
- **spec_ref**: `openspec/changes/screens-settings-form-reference-object-filter/specs/settings-form/spec.md#requirement-a-reference-fields-filter-can-name-the-record-being-edited`
- **files**: `src/components/CnSettingsFormWidget/CnSettingsFormWidget.vue`
- [x] Implement: `loadReferences` resolves `@objectId` / `@object.<field>`, waits, re-reads on a changed query
- [x] Test: `tests/components/CnSettingsFormWidgetReferenceObjectFilter.spec.js`
