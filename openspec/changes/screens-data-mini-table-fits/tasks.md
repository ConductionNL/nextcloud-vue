# Tasks: screens-data-mini-table-fits

### Task 1: The cells wrap
- **spec_ref**: `openspec/changes/screens-data-mini-table-fits/specs/data-widget/spec.md#requirement-a-list-of-objects-table-fits-its-value-cell`
- **files**: `src/components/CnObjectDataWidget/CnObjectDataWidget.vue`
- [x] Implement: `white-space: normal` on the mini table's cells
- [x] Test: e2e `e2e/l7-data-mini-table.e2e.js` (`?l7=data-mini-table`); CSS only, no unit test (jsdom computes no layout)
