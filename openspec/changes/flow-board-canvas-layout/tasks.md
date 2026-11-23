# Tasks: flow-board-canvas-layout

### Task 1: A quiet run
- **spec_ref**: `openspec/changes/flow-board-canvas-layout/specs/flow-board/spec.md#requirement-a-run-on-a-board-flow-page-shows-no-editing-chrome`
- **files**: `src/components/CnFlowDetail/CnFlowDetail.vue`, `src/components/CnFlowsPage/CnFlowBoard.vue`
- [x] Implement: `quietRun` prop; CnFlowBoard passes it
- [x] Test: `tests/components/CnFlowBoardCanvasLayout.spec.js`

### Task 2: The canvas layout
- **spec_ref**: `openspec/changes/flow-board-canvas-layout/specs/flow-board/spec.md#requirement-a-flow-page-can-be-laid-out-as-a-canvas-page`
- **files**: `src/components/CnFlowsPage/CnFlowBoard.vue`, `src/components/CnFlowsPage/CnFlowEditorPage.vue`, `src/components/CnFlowDetail/CnFlowDetail.vue`, `docs/components/cn-flow-editor-page.md`, `docs/components/cn-flow-detail.md`
- [x] Implement: `layout: "canvas"`, `toolbar-end` slot, floating inspector, run header pills, run card over the canvas
- [x] Test: `tests/components/CnFlowBoardCanvasLayout.spec.js`

### Task 3: Open (not in this change)
- [ ] Header Meer menu (PqFlow, PqFlowRun 19)
- [ ] Last run pill on the path line (PqFlow 11)
- [ ] Outcome legend as a titled card with the zoom (PqFlowRun legend)
- [ ] Board inspector form per step type (PqFlow 3, 4, 15-19: needs the spec to select a step, see TRIAGE)
