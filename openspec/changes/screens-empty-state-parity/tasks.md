# Tasks: screens-empty-state-parity

## Implementation Tasks

### Task 1: The card-size empty state
- **spec_ref**: `openspec/changes/screens-empty-state-parity/specs/empty-state/spec.md#requirement-the-card-size-empty-state`
- **files**: `src/components/CnWidgetEmptyState/CnWidgetEmptyState.vue`
- [x] Implement: `size` prop, card values, board default
- [x] Test: sizes asserted in jest (class per size, board default, compact and explicit size win); pixel check in a browser — not run: needs a browser

### Task 2: The library's empty states use it
- **spec_ref**: `openspec/changes/screens-empty-state-parity/specs/empty-state/spec.md#requirement-the-librarys-empty-states-use-it`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnCardGrid/CnCardGrid.vue`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnObjectKanban/CnObjectKanban.vue`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`, `src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue`, `src/components/CnTabsWidget/CnTabsWidget.vue`, `src/components/CnObjectList/CnObjectList.vue`, `src/components/CnFilesBrowser/CnFilesBrowser.vue`
- [x] Implement: switch on `cnLook` (via the internal `CnEmptyContent` adapter; CnAppRoot gains a `look` prop that provides `cnLook`, since `screens-dialog-parity` has not landed), keep the `empty` slots, error variant
- [x] Test: board look (CnCardGrid, CnObjectList, adapter) renders CnWidgetEmptyState inside the card; Nextcloud look renders NcEmptyContent

### Task 3: Only a drop zone is dashed
- **spec_ref**: `openspec/changes/screens-empty-state-parity/specs/empty-state/spec.md#requirement-only-a-drop-zone-is-dashed`
- **files**: `src/components/CnFileField/CnFileField.vue`, `src/components/CnFilesBrowser/CnFilesBrowser.vue`
- [ ] Implement: drop zone values; no dashed empty state elsewhere — not run: CnFileField has no drop zone and CnFilesBrowser no empty-state drop target in this checkout; no dashed empty state exists
- [ ] Test: one block on an empty, writable files tab — not run: needs the drop zone and a browser

### Task 4: Documentation
- **files**: `docs/components/cn-widget-empty-state.md`
- [x] JSDoc on `size`; a note on the one empty state of the board look
