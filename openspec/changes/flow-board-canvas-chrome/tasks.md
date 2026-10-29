# Tasks: flow-board-canvas-chrome

### Task 1: Header and path
- **spec_ref**: `openspec/changes/flow-board-canvas-chrome/specs/flow-board/spec.md#requirement-a-canvas-flow-page-has-a-more-menu-and-names-its-last-run`
- **files**: `src/components/CnFlowsPage/CnFlowBoard.vue`
- [x] More menu, buildiq and More in a run, last run pill, `metaParts: saved`
- [x] Test: `tests/components/CnFlowBoardCanvasChrome.spec.js`

### Task 2: Legend card and canvas controls
- **spec_ref**: `openspec/changes/flow-board-canvas-chrome/specs/flow-board/spec.md#requirement-a-canvas-run-shows-its-legend-as-one-card-with-the-zoom`
- **files**: `src/components/CnFlowDetail/CnFlowDetail.vue`, `src/components/CnFlowsPage/CnFlowBoard.vue`, `src/components/CnGraphCanvas/CnGraphCanvas.vue`
- [x] `toolbar-start` slot, titled legend with route entries, corner controls with icons
- [x] Test: `tests/components/CnFlowBoardCanvasChrome.spec.js`

### Task 3: Inspector and run panel
- **spec_ref**: `openspec/changes/flow-board-canvas-chrome/specs/flow-board/spec.md#requirement-the-canvas-inspector-and-run-panel-read-as-the-boards-draw-them`
- **files**: `src/components/CnFlowsPage/CnFlowBoard.vue`, `src/components/CnFlowDetail/CnFlowRunSummary.vue`
- [x] Kind line, name field, field descriptions, switch card, open log, footer; run step head, note, edit and play; run card icons
- [x] Test: `tests/components/CnFlowBoardCanvasChrome.spec.js`

### Task 4: The schema takes the layout word
- **spec_ref**: `openspec/changes/flow-board-canvas-chrome/specs/flow-board/spec.md#requirement-a-flow-page-manifest-can-name-its-layout`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `src/schemas/app-manifest.schema.json`
- [x] `config.layout` is the dashboard array or `canvas` / `cards`; v2 2.164.0
- [x] Test: `tests/utils/validateManifest.flowsPageType.spec.js`

### Open (not in this change)
- [ ] Each step type's settings (`configForm`), data in the catalogue
- [ ] "Ticket openen": the run's subject href on the board
