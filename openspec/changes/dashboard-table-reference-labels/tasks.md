# Tasks: dashboard-table-reference-labels

### Task 1: Reference label columns in the object table
- **spec_ref**: `openspec/changes/dashboard-table-reference-labels/specs/dashboard-page/spec.md#requirement-a-dashboard-table-shows-a-referenced-objects-label`
- **files**: `src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue`
- [x] Implement: `labelField` / `resolve` columns render as `fkResolve`; the target from `resolve` or the source schema's `$ref`
- [x] Test: `tests/components/CnWidgetObjectTable/CnWidgetObjectTableRefLabels.spec.js`; e2e `e2e/l16-invoice-customers.e2e.js`
