# Tasks: toggle-table-objects-and-map

### Task 1: each and map modes
- **spec_ref**: `openspec/changes/toggle-table-objects-and-map/specs/toggle-table/spec.md#requirement-a-toggle-table-can-switch-objects-or-a-config-map`
- **files**: `src/components/CnToggleTableWidget/CnToggleTableWidget.vue`, `src/components/CnSettingsPage/CnSettingsPage.vue`
- [x] Implement: `bind.mode` `each` and `map`, `invert`, refused write; `toggle-table` settings built-in
- [x] Test: `tests/components/CnToggleTableWidgetObjectsAndMap.spec.js`
- [x] Test: e2e `e2e/l15-toggle-table-objects.e2e.js` (real switch, list request and PATCH)
