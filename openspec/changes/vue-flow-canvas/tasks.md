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

- [x] 1.1 `CnGraphCanvas` re-implemented over `<VueFlow>` with Vue Flow's own
      props/events (design.md's mapping table). `nodeWidth`/`nodeHeight` are
      DELETED, not translated.
- [x] 1.2 `<Background>`, `<Controls>`, `<MiniMap>` wired; `snapToGrid`/
      `snapGrid` replace `gridSize`; `fitView` replaces the `viewBox` maths.
- [x] 1.3 `readOnly` expressed as Vue Flow's interaction flags, asserted by a
      test that a read-only canvas refuses drag, connect AND selection — one
      flag missed is a canvas that looks locked and is not.
- [x] 1.4 `@canvas-drop` kept, projected with Vue Flow's `project()`.
- [x] 1.5 The canvas still never mutates: `@nodes-change` is emitted, positions
      are not written back internally.

## 2. Keyboard operation — the no-downgrade contract

> Every item here exists TODAY. This section is not new capability; it is the
> list of things that must not be lost, and each has its own test because
> "we kept accessibility" is not a claim anyone can check by reading a diff.

- [x] 2.1 `CnFlowNode.vue`: `tabindex="0"`, `role="button"`, `aria-label`,
      `aria-pressed` on selection.
- [x] 2.2 Arrow keys move a focused node; Shift = coarse step.
- [x] 2.3 `c` starts a connection, `c` on a target completes it, `Escape`
      cancels.
- [x] 2.4 **Repeated `c` steps through a multi-exit node's out-ports**, ringing
      the armed one and marking it `aria-pressed`. Without this the keyboard
      reaches only the first branch and every other exit is mouse-only — the
      failure the current docblock names explicitly.
- [x] 2.5 Node resize reachable from the keyboard (`@vue-flow/node-resizer`
      plus the existing handle contract).
- [x] 2.6 hydra gate-32 (semantic-controls) and gate-36 (tabindex) pass on the
      new components. VERIFIED: only `tabindex="0"` (no positive values), no
      `@click` without a keyboard path, no `<img>` at all in either component.

## 3. Consumers and docs

- [x] 3.1 `CnFlowDetail` renders `CnGraphCanvas`; its hand-drawn SVG deleted.
      Dialog contract, `useFlowNodeEditors`, run-log links and step statuses
      unchanged.
- [x] 3.2 Vue Flow's CSS themed from Nextcloud CSS variables — light AND dark
      verified, no hardcoded colours. VERIFIED: 8 distinct Nextcloud variables,
      zero hex literals outside `var()` fallbacks — so dark mode follows the
      theme rather than needing its own rules.
- [x] 3.3 `docs/components/cn-graph-canvas.md` rewritten for the new API;
      `_generated/` regenerated; the Vue-2.7 rationale in the component
      docblock replaced rather than left contradicting the code.

## 4. Tested through Playwright e2e

- [x] 4.1 A flow renders: nodes drawn, edges connected, counts match the
      document.
- [x] 4.2 Pan, zoom and node drag change the viewport/positions.
- [x] 4.3 Connect two nodes by dragging; the emitted edge matches.
- [x] 4.4 **Keyboard-only**: tab to a node, move it with arrows, connect it with
      `c`…`c`, cancel with `Escape` — with no pointer events at all. This is
      2.1–2.4 proven from outside, and it is the assertion this change most
      needs, because a mouse-driven test passes over a keyboard regression
      without noticing.
- [x] 4.5 Read-only refuses drag, connect and selection.
- [x] 4.6 axe pass on the canvas page (gate-33), light and dark.

## 5. Measure what it cost

- [x] 5.1 Record the bundle delta (gz) for `@conduction/nextcloud-vue` and the
      net line count removed. If the delta is worse than expected, say so in the
      archive note rather than quietly shipping it — ~21 apps pay it, including
      those with no canvas.


## Measured on completion (2026-08-23)

- **Unit suite: 539 suites / 6,430 tests, all passing**, with the canvas spec
  rewritten rather than deleted.
- **Bundle:** consumer pays ~71 KB gz (`@vue-flow/core` externalised, so the
  library's own `dist/` does not grow) against **2,115 hand-rolled lines
  removed**.
- **Build:** rollup, exit 0, no new errors.

### What the old spec's 55 tests became, and why that is not a loss

Most of them asserted GEOMETRY — node centres, coordinate conversion under pan
and zoom, edge endpoints, the dot grid, drag deltas. All of that is Vue Flow's
now, and re-asserting it would be testing our dependency: expensive to keep, and
green whether or not our own code is right. They were replaced by 17 tests over
the three things the swap could silently remove: keyboard operation, read-only
refusing all three interactions, and the canvas not mutating the graph.

### ⚠️ Vue Flow does NOT render nodes under jsdom

It measures nodes before rendering them, and jsdom has no layout — mounting the
canvas in a unit test yields ZERO node elements. `CnFlowKeyboardConnect.spec.js`
drove the full canvas path and would have started passing over an empty list,
which is precisely the failure its own docblock warns about ("went green by not
running"). So the keyboard MECHANICS are asserted directly on `CnFlowNode`, the
browser path moves to task 4.4, and that spec now asserts only the half that
still has teeth in jsdom — the dialect the resulting edge is written in. Its
name was changed to say so.

`tests/setup.js` gains a no-op `ResizeObserver`, which jsdom lacks. That is the
same measurement capability that let `nodeWidth`/`nodeHeight` be deleted.


## What the e2e caught that nothing else did

Three real defects, all invisible to the unit lane and the gates:

1. **`@vue-flow/controls` renders unlabelled buttons** — axe `button-name`, SERIOUS.
   Adding the library's control bar would have shipped a control a screen-reader
   user cannot identify. The canvas now renders its OWN labelled controls and the
   package was uninstalled.
2. **`fitView` was both a boolean PROP and Vue Flow's function of the same name.**
   The fit button was calling `true`. A suite that clicked only "Zoom in" reported
   a healthy control bar over a dead button, so the e2e now exercises EVERY
   control.
3. **Vue Flow's whole node record fell through onto the DOM** as attributes
   (`events="[object Object]"`), fixed with `inheritAttrs: false`.

And two lessons about measuring the right thing:

- **A screen box is not a position.** `fitView` reframes the viewport after
  mount, which moved every node on screen without moving it in the graph — the
  read-only test reported a 22px "drag" that never happened. Both drag tests now
  compare the NODE's own transform.
- **Vue Flow consumes the `id` passed to `<Handle>` and re-emits it as
  `data-handleid`.** Reading `id` returned null for every port, which collapses
  to one distinct value and would have let the multi-exit test pass while
  stepping was broken.
