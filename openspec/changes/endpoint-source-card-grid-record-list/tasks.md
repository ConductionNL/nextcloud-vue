# Tasks: endpoint-source-card-grid-record-list

### Task 1: Endpoint rows for the record list and the card grid
- **spec_ref**: `openspec/changes/endpoint-source-card-grid-record-list/specs/dashboard-page/spec.md#requirement-a-record-list-and-a-card-grid-can-read-an-endpoint`
- **files**: `src/components/CnRecordListWidget/CnRecordListWidget.vue`, `src/components/CnWidgetCardGrid/CnWidgetCardGrid.vue`
- [x] Implement: `endpointSource` through `useEndpointSource` in both widgets
- [x] Test: `tests/components/CnRecordListWidgetEndpointSource.spec.js`; e2e `e2e/l16-bank-accounts.e2e.js`
