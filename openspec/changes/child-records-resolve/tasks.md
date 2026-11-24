# Tasks: child-records-resolve

### Task 1: A row added from a source record takes the values the server decides
- **spec_ref**: `openspec/changes/child-records-resolve/specs/child-records-resolve/spec.md#requirement-a-row-added-from-a-source-record-takes-the-values-the-server-decides`
- **files**: `src/components/CnChildRecordsField/CnChildRecordsField.vue`, `src/utils/childRecordResolve.js`, `l10n/en.json`, `l10n/nl.json`, `docs/components/cn-child-records-field.md`
- [x] Implement: `addFrom.resolve` (`url`, `method`, `body`, `map`), the failure message
- [x] Test: `tests/components/CnChildRecordsFieldResolve.spec.js`

### Task 2: A change to the quantity asks again, a typed price is kept
- **spec_ref**: `openspec/changes/child-records-resolve/specs/child-records-resolve/spec.md#requirement-a-change-to-a-when-key-asks-again-and-a-typed-value-is-kept`
- **files**: `src/components/CnChildRecordsField/CnChildRecordsField.vue`, `src/utils/childRecordResolve.js`
- [x] Implement: `addFrom.resolve.when` in the row dialog and the cell edit (debounced)
- [x] Test: `tests/components/CnChildRecordsFieldResolve.spec.js`
