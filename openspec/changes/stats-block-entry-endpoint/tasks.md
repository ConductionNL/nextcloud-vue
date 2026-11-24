# Tasks: stats-block-entry-endpoint

### Task 1: A stats-block entry can read its value from an endpoint
- **spec_ref**: `openspec/changes/stats-block-entry-endpoint/specs/stats-block/spec.md#requirement-a-stats-block-entry-can-read-its-value-from-an-endpoint`
- **files**: `src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue`, `src/schemas/app-manifest-v2.schema.json`, `docs/components/cn-stats-block-widget.md`
- [x] Implement: `fetchEntryEndpoint()`, the entry keys in the schema (2.194.0), the refetch key
- [x] Test: `tests/components/CnStatsBlockWidget/CnStatsBlockWidget.endpoint.spec.js`
