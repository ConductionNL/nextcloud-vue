# Tasks: board-tonal-card-actions

### Task 1: A tonal Add on an object list
- **spec_ref**: `openspec/changes/board-tonal-card-actions/specs/board-tonal-card-actions/spec.md#requirement-an-object-list-add-can-be-the-tonal-pill`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`, `docs/components/cn-object-list-widget.md`
- [x] Implement: `content.addVariant: "tonal"` on the footer, empty-state and title-row Adds and the extra adds
- [x] Test: `tests/components/CnBoardTonalCardActions.spec.js`

### Task 2: Set up as the tonal pill
- **spec_ref**: `openspec/changes/board-tonal-card-actions/specs/board-tonal-card-actions/spec.md#requirement-a-connection-that-is-not-set-up-offers-set-up-as-the-tonal-pill`
- **files**: `src/components/CnConnectionsPanel/CnConnectionsPanel.vue`
- [x] Implement: `cn-button--tonal` on Set up
- [x] Test: `tests/components/CnBoardTonalCardActions.spec.js`
