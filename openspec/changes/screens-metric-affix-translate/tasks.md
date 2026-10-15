# Tasks: screens-metric-affix-translate

### Task 1: Translate literal affixes
- **spec_ref**: `openspec/changes/screens-metric-affix-translate/specs/dashboard-page/spec.md#requirement-a-metric-prefix-and-suffix-are-translated`
- **files**: `src/utils/formatMetric.js`, `src/components/CnStatWidget/CnStatWidget.vue`, `src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue`, `src/components/CnDeltaWidget/CnDeltaWidget.vue`, `src/components/CnGaugeWidget/CnGaugeWidget.vue`
- [x] Implement: `translateMetricAffixes`, the `translate` argument, the callers pass theirs
- [x] Test: `tests/utils/formatMetricAffixTranslate.spec.js`
