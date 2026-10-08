# Tasks: screens-empty-state-parity

## Implementation Tasks

### Task 1: The card-size empty state
- **spec_ref**: `openspec/changes/screens-empty-state-parity/specs/empty-state/spec.md#requirement-the-card-size-empty-state`
- **files**: `src/components/CnWidgetEmptyState/CnWidgetEmptyState.vue`
- [ ] Implement: `size` prop, card values, board default
- [ ] Test: sizes in a browser; `widget` and `compact` unchanged

### Task 2: The library's empty states use it
- **spec_ref**: `openspec/changes/screens-empty-state-parity/specs/empty-state/spec.md#requirement-the-librarys-empty-states-use-it`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnCardGrid/CnCardGrid.vue`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnObjectKanban/CnObjectKanban.vue`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`, `src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue`, `src/components/CnTabsWidget/CnTabsWidget.vue`, `src/components/CnObjectList/CnObjectList.vue`, `src/components/CnFilesBrowser/CnFilesBrowser.vue`
- [ ] Implement: switch on `cnLook`, keep the `empty` slots, error variant
- [ ] Test: per component, board look renders CnWidgetEmptyState inside the card; Nextcloud look renders NcEmptyContent

### Task 3: Only a drop zone is dashed
- **spec_ref**: `openspec/changes/screens-empty-state-parity/specs/empty-state/spec.md#requirement-only-a-drop-zone-is-dashed`
- **files**: `src/components/CnFileField/CnFileField.vue`, `src/components/CnFilesBrowser/CnFilesBrowser.vue`
- [ ] Implement: drop zone values; no dashed empty state elsewhere
- [ ] Test: one block on an empty, writable files tab

### Task 4: Documentation
- **files**: `docs/components/cn-widget-empty-state.md`
- [ ] JSDoc on `size`; a note on the one empty state of the board look
