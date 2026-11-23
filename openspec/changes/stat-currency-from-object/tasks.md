# Tasks: stat-currency-from-object

## Implementation Tasks

### Task 1: A stats-block entry formats its value
- **spec_ref**: `openspec/changes/stat-currency-from-object/specs/dashboard-page/spec.md#requirement-a-stats-block-entry-formats-its-value`
- **files**: `src/utils/formatMetric.js`, `src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue`, `src/components/CnDashboardPage/CnDashboardPage.vue`
- [x] Implement
- [x] Test (`tests/components/CnStatsBlockWidget/CnStatsBlockWidget.currency.spec.js`, `tests/utils/formatMetric.spec.js`)

### Task 2: A money value is shown in the currency the entry names
- **spec_ref**: `openspec/changes/stat-currency-from-object/specs/dashboard-page/spec.md#requirement-a-money-value-is-shown-in-the-currency-the-entry-names`
- **files**: `src/utils/formatMetric.js`, `src/components/CnStatWidget/CnStatWidget.vue`
- [x] Implement
- [x] Test (`tests/components/CnStatWidgetCurrency.spec.js`)

### Task 3: Schema and docs
- **files**: `src/schemas/app-manifest-v2.schema.json` (2.51.0), `tests/schemas/app-manifest-v2.schema.hashes.json`, docs
- [x] Schema bump and hash
- [x] Docs
