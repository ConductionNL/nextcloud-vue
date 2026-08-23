# Tasks — Vue Flow canvas

## 0. Prove the build, before anything is rewritten

- [x] 0.1 Add `@vue-flow/core` to `@conduction/nextcloud-vue` and render one
      `<VueFlow>` with two nodes and one edge inside the existing build.
      **This is the task that answers ADR-065's ghost**: procest's editor died
      at 272 build errors under Vue 2.7, and the claim that it now builds is
      exactly the kind of claim that should be measured rather than argued.
      MEASURED 2026-08-23, in an isolated `npm ci` worktree:
        `@vue-flow/core@1.48.2` installed against `vue ^3.5.13`
        build exit 0, **0 new errors** (the only warnings are the two
          pre-existing `field-inspection` circular imports and a
          `this-is-undefined` from `@microsoft/fetch-event-source`, both
          present on the baseline build before the dependency existed)
        baseline build 31 s -> 26.8 s with it; no regression
      CONSUMER COST: the library EXTERNALISES the dependency, so `dist/` does
      not grow — the consuming app pays `vue-flow-core.mjs` at 337 KB raw /
      **71 KB gz**, against 2,115 hand-rolled lines removed. That is higher
      than the ~50 KB the proposal guessed; the guess is corrected here rather
      than left standing.
      ⚠️ CORRECTION TO THIS FILE'S OWN WORDING: the build is **rollup**
      (`rollup.config.js`, `preserveModules`), not webpack. Anything in the
      design that reasons about webpack chunking needs re-reading against
      rollup before it is relied on.
      🔑 HOW THE FIRST ATTEMPT LIED. Exporting the probe from
      `src/components/index.js` was not enough: `src/index.js` re-exports a
      NAMED LIST, so the probe was tree-shaken and the build passed without
      ever compiling it. A green build proved nothing until
      `dist/esm/components/CnVueFlowProbe/` existed AND its output still
      carried `from '@vue-flow/core'`. Verify the artefact, not the exit code.
      The probe itself was scaffolding and is not committed — task 1.1 builds
      the real thing.
- [x] 0.2 If 0.1 fails, STOP and write down why. A second dead `@vue-flow`
      component is worse than a hand-rolled canvas that works.
      It did not fail. Proceed to 1.1.

## 1. The canvas

- [ ] 1.1 `CnGraphCanvas` re-implemented over `<VueFlow>` with Vue Flow's own
      props/events (design.md's mapping table). `nodeWidth`/`nodeHeight` are
      DELETED, not translated.
- [ ] 1.2 `<Background>`, `<Controls>`, `<MiniMap>` wired; `snapToGrid`/
      `snapGrid` replace `gridSize`; `fitView` replaces the `viewBox` maths.
- [ ] 1.3 `readOnly` expressed as Vue Flow's interaction flags, asserted by a
      test that a read-only canvas refuses drag, connect AND selection — one
      flag missed is a canvas that looks locked and is not.
- [ ] 1.4 `@canvas-drop` kept, projected with Vue Flow's `project()`.
- [ ] 1.5 The canvas still never mutates: `@nodes-change` is emitted, positions
      are not written back internally.

## 2. Keyboard operation — the no-downgrade contract

> Every item here exists TODAY. This section is not new capability; it is the
> list of things that must not be lost, and each has its own test because
> "we kept accessibility" is not a claim anyone can check by reading a diff.

- [ ] 2.1 `CnFlowNode.vue`: `tabindex="0"`, `role="button"`, `aria-label`,
      `aria-pressed` on selection.
- [ ] 2.2 Arrow keys move a focused node; Shift = coarse step.
- [ ] 2.3 `c` starts a connection, `c` on a target completes it, `Escape`
      cancels.
- [ ] 2.4 **Repeated `c` steps through a multi-exit node's out-ports**, ringing
      the armed one and marking it `aria-pressed`. Without this the keyboard
      reaches only the first branch and every other exit is mouse-only — the
      failure the current docblock names explicitly.
- [ ] 2.5 Node resize reachable from the keyboard (`@vue-flow/node-resizer`
      plus the existing handle contract).
- [ ] 2.6 hydra gate-32 (semantic-controls) and gate-36 (tabindex) pass on the
      new components.

## 3. Consumers and docs

- [ ] 3.1 `CnFlowDetail` renders `CnGraphCanvas`; its hand-drawn SVG deleted.
      Dialog contract, `useFlowNodeEditors`, run-log links and step statuses
      unchanged.
- [ ] 3.2 Vue Flow's CSS themed from Nextcloud CSS variables — light AND dark
      verified, no hardcoded colours.
- [ ] 3.3 `docs/components/cn-graph-canvas.md` rewritten for the new API;
      `_generated/` regenerated; the Vue-2.7 rationale in the component
      docblock replaced rather than left contradicting the code.

## 4. Tested through Playwright e2e

- [ ] 4.1 A flow renders: nodes drawn, edges connected, counts match the
      document.
- [ ] 4.2 Pan, zoom and node drag change the viewport/positions.
- [ ] 4.3 Connect two nodes by dragging; the emitted edge matches.
- [ ] 4.4 **Keyboard-only**: tab to a node, move it with arrows, connect it with
      `c`…`c`, cancel with `Escape` — with no pointer events at all. This is
      2.1–2.4 proven from outside, and it is the assertion this change most
      needs, because a mouse-driven test passes over a keyboard regression
      without noticing.
- [ ] 4.5 Read-only refuses drag, connect and selection.
- [ ] 4.6 axe pass on the canvas page (gate-33), light and dark.

## 5. Measure what it cost

- [ ] 5.1 Record the bundle delta (gz) for `@conduction/nextcloud-vue` and the
      net line count removed. If the delta is worse than expected, say so in the
      archive note rather than quietly shipping it — ~21 apps pay it, including
      those with no canvas.
