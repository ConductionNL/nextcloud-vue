# graph-canvas-check-strip Delta: graph-canvas-check-strip

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [graph-canvas-check-strip](../../)

## ADDED Requirements

### Requirement: A graph canvas shows what a check found

CnGraphCanvas SHALL take `issues` (`[{ level: 'error' | 'warning', text, nodeId? }]`) and SHALL draw them above the canvas as a strip with `role="status"`: a title counting errors and warnings (`issuesTitle` with `{errors}` and `{warnings}`, default "Check: {errors}, {warnings}."), then one line per finding, errors first, each prefixed "Error:" or "Warning:". A finding with `nodeId` SHALL be a button that fits that step into view and emits `issue-select` with its id. Without findings nothing SHALL be drawn.
