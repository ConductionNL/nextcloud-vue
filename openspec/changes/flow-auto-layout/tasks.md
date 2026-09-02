# Tasks: flow-auto-layout

- [x] Pure layout module `src/composables/flowGraphLayout.js`: `readNodePoint`
      (both position spellings), `needsFullLayout` (all absent, or all
      positioned nodes on one identical point), `layoutFlowNodes` (DFS back
      edge classification, longest-path layering, barycenter ordering, fixed
      grid), `placeLooseNodes` (arranged nodes kept by reference, loose nodes
      slotted beneath in run order).
- [x] `useFlowStore.applyRenderLayout()`: rendering fallback with no undo
      entry, no dirty flag, no lifecycle refusal; called from `open()` in
      place of the old `autoSort()` call.
- [x] `autoSort()` delegates to `layoutFlowNodes`, keeping the `pushUndo()`
      gate and dirty semantics.
- [x] Fixture: the real 18-node dossiq "Case behandeling" declaration
      (`src/composables/__tests__/__fixtures__/case-behandeling-flow.json`).
- [x] Unit tests `flowGraphLayout.spec.js`: diamond, parallel branches,
      longest-path shortcut, cycle tolerance (in-flow loop and unreachable
      two-node cycle), unreachable column, toolbar clearance, immutability,
      determinism, fixture (18 distinct well-separated points, left-to-right
      edges with exactly the flow's one loop-back pointing left), loose-node
      slotting.
- [x] Unit tests `useFlowStore.autoLayout.spec.js`: published position-less
      flow laid out on open with `dirty` false, `lifecycleRefusal` null and an
      empty undo stack; list row untouched; determinism across opens;
      explicit all-(0,0) pile; arranged flow untouched; mixed flow slots loose
      nodes only; `autoSort()` still refuses a locked graph and still edits a
      draft.
- [x] Docs partial: `docs/components/cn-flow-detail.md` gains "Opening a flow
      that has no layout".
- [x] `npm test`, `npm run lint`, `npm run stylelint`, `npm run check:docs`,
      `npm run check:jsdoc` green.
