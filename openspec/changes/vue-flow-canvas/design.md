# Design — Vue Flow canvas

## Decision 1: adopt Vue Flow's model, do not wrap it

`CnGraphCanvas` becomes a thin composition over `<VueFlow>` that adds
Conduction's node chrome and keyboard contract, and nothing else.

**Rejected: a compatibility shim** translating today's props
(`viewBox`, `gridSize`, `showGrid`, `connectable`, `nodeWidth`/`nodeHeight`)
onto Vue Flow. It buys nothing — there is no production consumer to protect —
and it costs permanently: a translation layer can only ever expose what the old
API could already express, so `fitView`, `<MiniMap>`, `connectionMode` and the
node-resizer would stay unreachable behind props designed for a hand-drawn SVG.

The mapping is therefore a **replacement**, not an adapter:

| today | becomes | note |
|---|---|---|
| `nodes: [{ id, x, y, … }]` | `nodes: [{ id, type, position: {x,y}, data }]` | Vue Flow's shape; `type` selects the node component |
| `edges: [{ id, from, to }]` | `edges: [{ id, source, target }]` | Vue Flow's names |
| `viewBox`, `zoom`, `minZoom`, `maxZoom` | `:default-viewport`, `:min-zoom`, `:max-zoom`, `fitView` | manual viewBox maths deleted |
| `showGrid`, `gridSize` | `<Background>` + `:snap-to-grid`, `:snap-grid` | |
| `connectable` | `:connection-mode`, `:nodes-connectable` | richer: loose vs strict |
| `readOnly` | `:nodes-draggable`, `:nodes-connectable`, `:elements-selectable` all false | explicit rather than one flag |
| `resizable` | `<NodeResizer>` inside the node component | `@vue-flow/node-resizer` |
| `nodeWidth`/`nodeHeight` | **deleted** | existed only so hand-drawn edges could find a node centre; Vue Flow measures nodes itself |
| `#node` / `#edge` slots | `#node-{type}` / `#edge-{type}` | per-type components, Vue Flow's convention |
| `@node-move`, `@node-resize` | `@nodes-change` | one change stream |
| `@connect`, `@node-select`, `@edge-select`, `@canvas-click` | same names, Vue Flow payloads | |
| `@canvas-drop` | kept | see Decision 3 |
| — | `<MiniMap>`, `<Controls>` | gained |

`nodeWidth`/`nodeHeight` disappearing is the clearest sign this is the right
shape: they exist today *only* because hand-drawn edges had to guess where a
node's centre was, and the current docblock admits the failure mode — "set them
to match what your node slot actually renders, or edges will attach off-centre".
Vue Flow measures the rendered node, so the class of bug goes with the props.

## Decision 2: keyboard operation is re-implemented, not inherited

**This is the part that can silently regress, so it is specified first.**

Vue Flow renders nodes through a component you supply, and that component owns
its own DOM. The keyboard contract therefore lives in
`CnFlowNode.vue` (the default node component), which reproduces today's
behaviour exactly:

- `tabindex="0"`, `role="button"`, `:aria-label`, `:aria-pressed` for selection
- arrow keys move the focused node (Shift = coarse step), emitting a Vue Flow
  position change rather than mutating
- `c` starts a connection from the focused node, `c` on a target completes it,
  `Escape` cancels
- on a node with several exits, repeated `c` **steps through the out-ports**,
  ringing the armed one and marking it `aria-pressed`

That last one is not optional polish. The current docblock records what its
absence costs: *"without this the keyboard could only ever reach the first, so
every other branch was mouse-only."* A routing node's second branch being
mouse-only is a WCAG 2.1.1 failure on the feature the canvas exists for.

Vue Flow's own `:elements-selectable` and focus handling are used where they
help, but the affordances above are asserted by test rather than assumed from
the library.

## Decision 3: the canvas still never mutates the graph

Kept from the current design, because it is right and Vue Flow does not require
otherwise. Vue Flow can own node positions internally; here it does not.
`@nodes-change` is emitted to the consumer, which decides what to persist — the
same rule as today's *"the canvas never adds one itself, mirroring how it never
mutates positions."*

`@canvas-drop` is kept as a Conduction-level event because HTML5 drop plus
coordinate projection is glue every consumer would otherwise write; the point is
projected with Vue Flow's `project()` instead of the hand-rolled
`(clientX - rect.left - panOffset.x) / zoom`.

## Decision 4: `CnFlowDetail` keeps its shape

`CnFlowDetail` loses its hand-drawn SVG and renders `CnGraphCanvas`. Its dialog
contract (`Done`/`Cancel`/`Remove`), the registered per-node editors
(`useFlowNodeEditors`), the run-log links and the step-status rendering are
untouched — none of them are canvas concerns.

## Risks

**Bundle size.** `@vue-flow/core` is ~50 KB gz and lands in a package ~21 apps
consume, including apps with no canvas. Measured against ~2,100 lines removed.
If it matters, the canvas is a candidate for an async chunk — but that is a
webpack decision to take with a number in hand, not upfront.

**The `@vue-flow` name is scarred.** ADR-065 records an editor that "never ran"
under this dependency. The cause is documented and specific — Vue 2.7 — and the
peer ranges above show it does not apply. Task 1 exists to prove that with a
build rather than an argument.

**Theming.** Vue Flow ships its own CSS. Nextcloud theming and dark mode must be
driven from CSS variables, not overridden ad hoc, or the canvas will be the one
component that ignores the user's theme.
