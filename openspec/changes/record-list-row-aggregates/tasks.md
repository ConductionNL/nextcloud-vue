# Tasks: record-list-row-aggregates

### Task 1: A record list row can carry a figure over its related objects
- **spec_ref**: `openspec/changes/record-list-row-aggregates/specs/record-list/spec.md#requirement-a-record-list-row-can-carry-a-figure-over-its-related-objects`
- **files**: `src/utils/rowAggregate.js`, `src/components/CnDataTable/CnDataTable.vue`, `src/components/CnRecordListWidget/CnRecordListWidget.vue`, docs
- [x] Implement: shared row aggregate helper, `content.aggregates`
- [x] Test: `tests/components/CnRecordListWidgetAggregates.spec.js`, the CnDataTable aggregate specs unchanged
