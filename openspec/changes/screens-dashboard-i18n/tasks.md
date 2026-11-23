# Tasks: screens-dashboard-i18n

## Implementation Tasks

### Task 1: Preset labels
- **spec_ref**: `openspec/changes/screens-dashboard-i18n/specs/dashboard-page/spec.md#requirement-date-range-preset-labels-are-translated`
- **files**: `src/components/CnDateRangePicker/CnDateRangePicker.vue`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: `translatePresetLabel`, `effectivePresets`, `presetOptions`, catalogue entries
- [x] Test: library, app and unknown labels; picker options; dashboard presets

### Task 2: Chart labels
- **spec_ref**: `openspec/changes/screens-dashboard-i18n/specs/dashboard-page/spec.md#requirement-chart-view-labels-and-series-names-are-translated`
- **files**: `src/components/CnChartWidget/CnChartWidget.vue`
- [x] Implement: `hostTranslate`, `plottedSeries`, the view pill label
- [x] Test: translated pill and series, view filter on the written name
- [ ] Browser: PqVerkoopoverzicht on :8080 (not run: app lane checks after the release)
