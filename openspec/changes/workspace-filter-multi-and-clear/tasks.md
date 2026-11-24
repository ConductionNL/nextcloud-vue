# Tasks: workspace-filter-multi-and-clear

### Task 1: A select can take several values
- **spec_ref**: `openspec/changes/workspace-filter-multi-and-clear/specs/workspace-filter-multi-and-clear/spec.md#requirement-a-workspace-filter-select-can-take-several-values`
- **files**: `src/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue`, `docs/components/cn-workspace-filter-widget.md`
- [x] Implement: `multiple: true` (comma-joined value, address read, clearable, no first-option seed)
- [x] Test: `tests/components/CnWorkspaceFilterMultiAndClear.spec.js`

### Task 2: A bar counts and clears its filters
- **spec_ref**: `openspec/changes/workspace-filter-multi-and-clear/specs/workspace-filter-multi-and-clear/spec.md#requirement-a-bar-counts-and-clears-its-filters`
- **files**: `src/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: bar `clear`, controls' `filter: true`, "Filters ({count})", "Clear filters"
- [x] Test: `tests/components/CnWorkspaceFilterMultiAndClear.spec.js`
