# Tasks: flow-canvas-fit-below-chrome

### Task 1: Fit clear of floating chrome
- **spec_ref**: `openspec/changes/flow-canvas-fit-below-chrome/specs/flow-board/spec.md#requirement-the-canvas-frames-the-graph-clear-of-floating-chrome`
- **files**: `src/utils/overlayInset.js`, `src/components/CnGraphCanvas/CnGraphCanvas.vue`, `src/components/CnFlowDetail/CnFlowDetail.vue`, `src/components/CnFlowsPage/CnFlowBoard.vue`, `docs/components/cn-graph-canvas.md`, `docs/components/cn-flow-detail.md`
- [x] Implement: `fitInset` on CnGraphCanvas and CnFlowDetail, `canvasChromeInset` on CnFlowBoard, canvas fills the body
- [x] Test: `tests/utils/overlayInset.spec.js`, `tests/components/flowCanvasFitBelowChrome.spec.js`
