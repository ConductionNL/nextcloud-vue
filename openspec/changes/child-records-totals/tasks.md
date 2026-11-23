# Tasks: child-records-totals

### Task 1: A child-records table can show computed columns
- **spec_ref**: `openspec/changes/child-records-totals/specs/child-records-totals/spec.md#requirement-a-child-records-table-can-show-computed-columns`
- **files**: `src/components/CnChildRecordsField/CnChildRecordsField.vue`, `src/utils/childRecordTotals.js`
- [x] Implement: `config.computed`, `store`
- [x] Test: `tests/components/CnChildRecordsFieldTotals.spec.js`

### Task 2: A child-records table can show totals
- **spec_ref**: `openspec/changes/child-records-totals/specs/child-records-totals/spec.md#requirement-a-child-records-table-can-show-totals`
- **files**: `src/components/CnChildRecordsField/CnChildRecordsField.vue`, `src/utils/childRecordTotals.js`
- [x] Implement: `config.totals`, event `totals`
- [x] Test: `tests/components/CnChildRecordsFieldTotals.spec.js`

### Task 3: A child-records table can add rows from another schema
- **spec_ref**: `openspec/changes/child-records-totals/specs/child-records-totals/spec.md#requirement-a-child-records-table-can-add-rows-from-another-schema`
- **files**: `src/components/CnChildRecordsField/CnChildRecordsField.vue`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: `config.addFrom`, `codeField`, `freeRows`
- [x] Test: `tests/components/CnChildRecordsFieldTotals.spec.js`

### Task 4: The form passes the keys from the schema
- **spec_ref**: `openspec/changes/child-records-totals/specs/child-records-totals/spec.md#requirement-a-child-records-table-can-show-totals`
- **files**: `src/utils/schema.js`, `docs/components/cn-child-records-field.md`
- [x] Implement: `fieldsFromSchema` passes `computed`, `totals`, `addFrom`
- [x] Test: `tests/utils/schemaChildRecords.spec.js`
