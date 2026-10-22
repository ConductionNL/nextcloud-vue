# Tasks: flow-test-with-a-record

### Task 1: Testing a flow with a record changes nothing
- **spec_ref**: `openspec/changes/flow-test-with-a-record/specs/flow-test-with-a-record/spec.md#requirement-testing-a-flow-with-a-record-changes-nothing`
- **files**: `src/composables/useFlowStore.js`, `src/components/CnFlowsPage/CnFlowBoard.vue`
- [x] Implement: `dryRun`, `clearDryRun`, the button and dialog
- [x] Test: `tests/composables/useFlowStoreDryRun.spec.js`, `tests/components/flowBoardTestSubject.spec.js`

### Task 2: The result shows each step beside the canvas
- **spec_ref**: `openspec/changes/flow-test-with-a-record/specs/flow-test-with-a-record/spec.md#requirement-the-result-shows-each-step-beside-the-canvas`
- **files**: `src/components/CnFlowDetail/CnFlowDryRunResult.vue`, `src/components/CnFlowsPage/CnFlowBoard.vue`
- [x] Implement: the result panel in the inspector column
- [x] Test: `tests/components/CnFlowDryRunResult.spec.js`
