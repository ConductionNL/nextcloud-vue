# flow-auto-layout

## Why

A flow declared in a schema's `x-openregister-flows` carries no node
positions: dossiq's 18-node "Case behandeling" flow ships nodes with no `x`,
no `y`, and no `position` at all. `SchemaFlowImportListener` publishes such a
flow the moment it imports it.

Those two facts collide in the editor. `open()` already had a fallback for
position-less flows, but it routed through `autoSort()` — an EDIT, gated on
`pushUndo()`, which refuses when the graph is locked. A published flow is
locked. So the exact flows that always need the fallback were the ones it
silently skipped: every imported flow opened with all of its nodes stacked on
one point. Fit-view and zoom cannot help a pile, and the run replay's
per-node badges (which work) painted onto a single unreadable spot. Found in
the 2026-09-01 live acceptance run; it blocks reading any imported flow and
its run overlay.

Two further gaps in the old fallback:

- It only fired when NO node had a position, and `hasPosition()` counts
  (0, 0) as positioned. An importer that stamps `{x: 0, y: 0}` on every node
  produces the same pile, with coordinates written down.
- A flow with SOME positioned nodes left the position-less rest at the
  origin, under the arranged graph.

The layering itself also mishandled loops: its n² budget stopped the walk but
never broke the cycle, so a loop's members (and everything after them) drifted
right on every revisit until the budget died. The dossiq flow has a real loop
(resubmission: ask the submitter, wait, check again).

## What Changes

- A pure, deterministic layout module (`src/composables/flowGraphLayout.js`):
  longest-path layering with back edges classified by DFS and dropped from
  layering (drawn, never layered on), one barycenter ordering pass per column,
  fixed grid spacing. No new dependency: dagre and friends are real weight,
  the in-app CSP allows no CDN, and nothing already in the tree ships a layout
  engine; the pass is ~150 lines.
- `useFlowStore.applyRenderLayout()`: a rendering fallback `open()` calls,
  which never edits — no undo entry, no dirty flag, no lifecycle refusal — so
  it runs on published flows. Full layout when no usable positions exist
  (none at all, or every positioned node on one identical point); otherwise
  position-less nodes slot beneath the arranged graph, which stays untouched.
- `autoSort()` (the toolbar's Arrange button) delegates to the same pure pass,
  keeping its edit semantics: `pushUndo()` gate, dirty flag.
- The real 18-node dossiq declaration becomes a unit-test fixture.

Per ADR-065 the canvas stays a geometry-only renderer: `CnGraphCanvas` and
`CnFlowDetail`'s node mapping are unchanged; the layout lives with the owner
of the document, `useFlowStore`.

## Impact

- Affected specs: `flow-auto-layout` (new)
- Affected code: `src/composables/flowGraphLayout.js` (new),
  `src/composables/useFlowStore.js` (`open()` fallback, `autoSort()`,
  new `applyRenderLayout()`), docs partial `docs/components/cn-flow-detail.md`
- Affected apps: every consumer of the flow editor (dossiq, hermiq,
  openregister, integriq); no API change, no manifest change, no new strings
