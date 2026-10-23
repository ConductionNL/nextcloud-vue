# Tasks: board-map-controls

### Task 1: The board map draws its buttons as one column in the top right
- **spec_ref**: `openspec/changes/board-map-controls/specs/board-map-controls/spec.md#requirement-the-board-map-draws-its-buttons-as-one-column-in-the-top-right`
- **files**: `src/components/CnMapWidget/CnMapWidget.vue`, `l10n/en.json`, `l10n/nl.json`, `tests/l10n/nl-missing-baseline.json`
- [x] Implement: zoom buttons in the bar, bar top right, switcher top left, crosshairs fit icon, Dutch names
- [x] Test: `tests/components/CnMapWidget.spec.js`

### Task 2: The board map's buttons are 36px edged squares
- **spec_ref**: `openspec/changes/board-map-controls/specs/board-map-controls/spec.md#requirement-the-board-maps-buttons-are-36px-edged-squares`
- **files**: `src/css/look-board.css`
- [x] Implement: column, gaps, corner inset, button size, edge, radius, colours
- [x] Test: `tests/css/lookBoardMapControls.spec.js`
