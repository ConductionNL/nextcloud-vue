# Tasks: screens-stats-block-operator-keys

### Task 1: Operator keys reach the aggregation as nested parameters
- **spec_ref**: `openspec/changes/screens-stats-block-operator-keys/specs/stats-block/spec.md#requirement-a-stats-block-filter-can-spell-its-operator-in-the-key`
- **files**: `src/utils/fetchAggregate.js`, `src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue`, `src/components/CnStatWidget/CnStatWidget.vue`
- [x] Implement: `aggFilterParam`
- [x] Test: `tests/utils/aggFilterParam.spec.js`, `tests/components/CnStatsBlockWidget/CnStatsBlockWidget.operatorKeys.spec.js`
