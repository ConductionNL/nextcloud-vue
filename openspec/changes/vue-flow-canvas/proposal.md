# Adopt Vue Flow as the flow canvas

## Why

**The Vue 3 migration was justified on this, and the payoff was never
collected.** ADR-081's Context says so directly:

> the flow-builder direction (ADR-065) needs a graph canvas, and every
> maintained option — Vue Flow (`@vue-flow`, **which n8n itself runs**),
> rete.js, the whole ecosystem — is **Vue-3-only**

and lists among the positives that `CnGraphCanvas` *"can eventually be replaced
by a maintained library (Vue Flow) instead of hand-rolled, and the flow-builder
(ADR-065) gets n8n's actual stack."*

ADR-065 §5 deferred it, and was explicit that the deferral was **conditional on
Vue 2.7**:

> Vue 2.7 is the constraint… Every actively-developed flow-canvas library is
> Vue-3-only… **We do not adopt it now** — procest's hand-rolled canvas already
> works… Keeping `CnGraphCanvas` a thin, self-owned component is what keeps a
> **future swap (or Vue 3 migration)** cheap.

That condition is gone, verified rather than assumed:

| | |
|---|---|
| `@conduction/nextcloud-vue` peer | `vue ^3.5.0` |
| `@vue-flow/core@1.48.2` peer | `vue ^3.3.0` |

**The earlier failure does not apply.** ADR-065 records procest's `@vue-flow`
editor dying at 272 build errors, and names the cause: *"every `@vue-flow/core`
release declares `peerDependencies: {"vue": "^3.x"}`. There has never been a
Vue-2 line."* It was a Vue-2 problem, not a Vue Flow problem.

What remains is **~2,100 hand-maintained lines** — `CnGraphCanvas.vue` (1,338)
plus the canvas half of `CnFlowDetail.vue` (777) — re-implementing pan, zoom,
drag, connect, resize and hit-testing that a maintained library ships.

## What changes

The canvas is rebuilt **on Vue Flow's own model**, not shimmed behind the
current component's API.

1. **`@vue-flow/core` becomes a dependency** of `@conduction/nextcloud-vue`,
   with `@vue-flow/background`, `@vue-flow/controls` and `@vue-flow/minimap` as
   the pieces that replace hand-rolled equivalents.
2. **`CnGraphCanvas` is re-implemented over `<VueFlow>`.** Its public API moves
   to Vue Flow's vocabulary — `nodes`/`edges` in Vue Flow's shape
   (`{ id, type, position: {x,y}, data }`, `{ id, source, target }`), Vue Flow's
   events (`nodesChange`, `edgesChange`, `connect`, `nodeClick`), and node types
   via the `#node-{type}` slot convention rather than one generic `#node` slot.
3. **`CnFlowDetail` consumes the new canvas** and drops its hand-drawn SVG.
4. **Docs and the generated component reference** are regenerated.

### Why the API moves rather than being preserved

The graph page **is not in production**, so there is no consumer to break and no
compatibility shim to carry. Wrapping Vue Flow behind the current props would
mean maintaining a translation layer forever, and would forfeit exactly the
features the swap is for — a shim can only expose what the old API could already
express.

Where Vue Flow offers a different or richer option than the current prop, **the
Vue Flow one wins**: `snapToGrid`/`snapGrid` replace `gridSize`, `fitView`
replaces manual `viewBox` maths, `<Background>` replaces `showGrid`,
`connectionMode` replaces `connectable`, and `<MiniMap>`/`<Controls>` are gained
outright.

## What must NOT regress

This is the constraint the design is built around. Everything the current canvas
does today must still be true afterwards:

| Capability | Today | Must hold after |
|---|---|---|
| Pan / zoom / node drag | hand-rolled | Vue Flow native |
| Connect nodes | drag between ports | Vue Flow native |
| Node resize | hand-rolled handle | `@vue-flow/node-resizer` |
| Drop from a palette | `@canvas-drop` with canvas-space point | equivalent, using Vue Flow's `project()` |
| Read-only mode | `readOnly` prop | Vue Flow's interaction flags |
| **Full keyboard operation** | **see below** | **see below** |

### ⚠️ Keyboard operation is the real risk, and the reason this needs a design

The current canvas is **keyboard-operable by deliberate design**, and its
docblock says why:

> A drag-only canvas is not keyboard-operable (WCAG 2.1 AA 2.1.1). Nodes are
> focusable; arrow keys move a focused node (Shift = coarse step); and a
> connection can be made without a mouse — press `c` on a focused node to start
> a connection, then `c` on another node to complete it (`Escape` cancels).
>
> Where a node has SEVERAL exits… pressing `c` again on the source steps through
> them, and the armed port is ringed and marked `aria-pressed`… without this the
> keyboard could only ever reach the first, so **every other branch was
> mouse-only**.

In the markup that is `tabindex="0"`, `role="button"`, per-node `aria-label`,
`aria-pressed` on both nodes and armed ports, and `@keydown` handlers for
select, move, resize and connect.

**Vue Flow is pointer-first.** Adopting it without replacing this would be a
straight WCAG 2.2 AA regression on a fleet that gates accessibility (ADR-004,
hydra gate-32 semantic-controls, gate-36 tabindex). "Non-breaking" refers to
consumers; it does not license losing an accessibility affordance.

So keyboard operation is **carried across explicitly**, as custom node
components that keep the focus/ARIA contract, and it is the first thing the e2e
asserts — not an afterthought.

## Impact

- **Consumers:** none today. The graph page is not in production; the only
  in-repo consumer is `CnFlowDetail`.
- **Blast radius:** `@conduction/nextcloud-vue` is depended on by ~21 apps, so
  the *package* is shared even though this component has no live users. Bundle
  size changes for everyone — `@vue-flow/core` is ~50 KB gz, against ~2,100
  lines removed.
- **Not in scope:** the flow *engine* (OpenRegister, ADR-065 §1–2), the node
  editor dialog (`CnFlowNodeEditModal`), and `CnFlowOperationPicker`.
