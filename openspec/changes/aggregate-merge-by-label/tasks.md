# Tasks: aggregate-merge-by-label

### Task 1: An aggregate can merge groups by label
- **spec_ref**: `openspec/changes/aggregate-merge-by-label/specs/aggregate-merge-by-label/spec.md#requirement-an-aggregate-can-merge-groups-by-label`
- **files**: `src/components/CnChartWidget/CnChartWidget.vue`, `src/schemas/app-manifest-v2.schema.json`, `docs/components/cn-chart-widget.md`
- [x] Implement: merge before topN, schema 2.141.0
- [x] Test: `tests/components/CnChartWidgetAggregate.spec.js`, `tests/utils/validateManifest.wave3.spec.js`

### Task 2: A merged bar drills into all its keys
- **spec_ref**: `openspec/changes/aggregate-merge-by-label/specs/aggregate-merge-by-label/spec.md#requirement-a-merged-bar-drills-into-all-its-keys`
- **files**: `src/components/CnChartWidget/CnChartWidget.vue`
- [x] Implement: keys kept per merged group
- [x] Test: `tests/components/CnChartWidgetAggregate.spec.js`
