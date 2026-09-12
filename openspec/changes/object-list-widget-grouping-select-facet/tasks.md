# Tasks: object-list-widget-grouping-select-facet

> `CnObjectListWidget` grows `groupBy`, `selectable`+`bulkActions`, `sortable`,
> `facet`, and a click-to-upload button riding `dropZone` (ADR-032 `kind: code`).
> Checkbox budget: 5 tasks × 2 = 10 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Row grouping (`groupBy` / `groupLabel`)
- **spec_ref**: `openspec/changes/object-list-widget-grouping-select-facet/specs/cn-workspace-context-widgets/spec.md#requirement-cnobjectlistwidget-groups-rows-by-a-field`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`, `tests/components/CnObjectListWidgetGroupSelectFacet.spec.js`
- **acceptance_criteria**:
  - Rows bucket into `groupedRows` by `content.groupBy`, first-seen order
  - A `$ref` group key (an extend-inlined object) groups by `.id`, not its stringified form
  - `content.groupBy` absent renders the pre-existing single-table path unchanged
- [x] Implement
- [x] Test

### Task 2: Multi-select with bulk actions (`selectable` / `bulkActions`)
- **spec_ref**: `openspec/changes/object-list-widget-grouping-select-facet/specs/cn-workspace-context-widgets/spec.md#requirement-cnobjectlistwidget-supports-multi-select-and-bulk-actions`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`, `tests/components/CnObjectListWidgetGroupSelectFacet.spec.js`
- **acceptance_criteria**:
  - `content.selectable` wires CnDataTable's existing checkbox column and `@select`
  - A `handler` bulk action receives the selected ROW OBJECTS (not just ids); an `open-modal` bulk action receives `props.selectedIds`
  - The bulk bar renders only once something is selected, and clears selection after dispatch
- [x] Implement
- [x] Test

### Task 3: Interactive sort (`sortable`)
- **spec_ref**: `openspec/changes/object-list-widget-grouping-select-facet/specs/cn-workspace-context-widgets/spec.md#requirement-cnobjectlistwidget-supports-interactive-column-sort`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`, `tests/components/CnObjectListWidgetGroupSelectFacet.spec.js`
- **acceptance_criteria**:
  - `content.sortable` (bool or array of keys) marks matching columns sortable, without overriding an explicit `sortable: false`
  - A header-click `sort` event overwrites `localSort` and the next fetch carries the new `_order`
  - A cleared sort (`key: null`) goes back to unordered rather than sticking on the last field
- [x] Implement
- [x] Test

### Task 4: Facet filter (`facet`)
- **spec_ref**: `openspec/changes/object-list-widget-grouping-select-facet/specs/cn-workspace-context-widgets/spec.md#requirement-cnobjectlistwidget-supports-a-facet-filter`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`, `tests/components/CnObjectListWidgetGroupSelectFacet.spec.js`
- **acceptance_criteria**:
  - `facetOptions` lists distinct values of `content.facet.field` across loaded rows, flattening an array field
  - `facetedRows` narrows on ANY selected value matching (`some`, not `every`)
  - A facet selection matching zero rows shows a distinct empty state from "no rows at all"
- [x] Implement
- [x] Test

### Task 5: Click-to-upload button (rides `dropZone`)
- **spec_ref**: `openspec/changes/object-list-widget-grouping-select-facet/specs/cn-workspace-context-widgets/spec.md#requirement-a-click-to-upload-button-rides-the-declared-dropzone-action`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`, `tests/components/CnObjectListWidgetGroupSelectFacet.spec.js`
- **acceptance_criteria**:
  - The button renders only when `dropZone` is declared and `content.upload !== false`
  - Picking files dispatches the same `dropZoneAction`, same shape as a drop
  - No files chosen dispatches nothing
- [x] Implement
- [x] Test
