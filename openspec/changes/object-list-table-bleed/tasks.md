# Tasks: object-list-table-bleed

### Task 1: An object list can run its table edge to edge in its card
- **spec_ref**: `openspec/changes/object-list-table-bleed/specs/object-list-table-bleed/spec.md#requirement-an-object-list-can-run-its-table-edge-to-edge-in-its-card`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`, `src/css/look-board-detail.css`, `docs/components/cn-object-list-widget.md`
- [x] Implement: `content.tableBleed` marks the widget; board look runs a marked table under the card's side padding with 22px outer cells
- [x] Test: `tests/components/CnObjectListWidgetTableBleed.spec.js`, `tests/css/lookBoardObjectListTableBleed.spec.js`
