---
sidebar_position: 44
---

# CnGraphCanvas

A generic node/edge canvas built on [Vue Flow](https://vueflow.dev) — the library n8n runs. Vue Flow owns pan, zoom, dragging, connecting and edge routing; this component adds Conduction's node chrome, the palette-drop event, and the keyboard contract.

It has no opinion about what a node *means*. No statuses, no steps, no guards, no conditions, no persistence. You supply `nodes` and `edges` as plain geometry and render the bodies through slots.

**Not a flow builder.** Per [ADR-065](https://github.com/ConductionNL/hydra) this is a shared *renderer*. The palette, property panels, condition editors, validators, and persistence rules that surround a real editor are app-specific and stay in the consuming app — they are roughly 80% of an editor's code and 0% of what is reusable. A canvas that tried to own them would be a forced marriage between apps whose models genuinely differ.

**History, because the previous version of this page said the opposite.** This canvas used to be ~1,300 hand-written lines on a bare SVG, and this paragraph used to explain that `@vue-flow` was deliberately avoided because "every `@vue-flow/core` release declares a Vue 3 peer dependency, and this library is Vue 2.7". That was true and is no longer: ADR-081 migrated the fleet to Vue 3 *specifically* to unblock this, naming Vue Flow as the reason. Measured before the swap: `@vue-flow/core@1.48.2` against `vue ^3.5.13` builds with **zero** errors, where the Vue-2.7 attempt produced 272.

**Cost.** The library is externalised, so consuming apps pay ~71 KB gz — against ~2,100 hand-maintained lines removed.

## Try it

Drag a node. Drag from a node's handle onto another node to connect them. Scroll
to zoom, drag empty space to pan.

**Or use no pointer at all.** Tab to a node, move it with the arrow keys (Shift
for a coarse step), press `c` to start a connection and `c` on another node to
complete it, `Escape` to cancel. On a node with several exits, repeated `c`
steps through them and rings the armed one — a mouse picks a branch by pointing
at it, and without this the keyboard could only ever reach the first.

```vue
<template>
  <div style="height: 420px; border: 1px solid var(--color-border);">
    <CnGraphCanvas
      :nodes="nodes"
      :edges="edges"
      @nodes-change="onNodesChange"
      @connect="onConnect"
      @node-remove="onNodeRemove"
      @node-select="selectedId = $event.node.id"
      @canvas-click="selectedId = null">
      <template #node="{ node }">
        <div style="padding: 8px;">
          <strong>{{ node.data.label }}</strong>
        </div>
      </template>
    </CnGraphCanvas>
  </div>
</template>

<script>
export default {
  data() {
    return {
      selectedId: null,
      // Vue Flow's shape: `position`, and per-node `data`.
      nodes: [
        { id: 'draft', type: 'default', position: { x: 60, y: 60 }, data: { label: 'Draft' } },
        { id: 'review', type: 'default', position: { x: 340, y: 60 }, data: { label: 'In review' } },
        { id: 'approved', type: 'default', position: { x: 340, y: 220 }, data: { label: 'Approved' } },
      ],
      edges: [
        { id: 'e1', source: 'draft', target: 'review' },
      ],
    }
  },
  methods: {
    // Positions are owned by the consumer — the canvas only reports intent.
    // Vue Flow emits ONE change stream for drags, keyboard moves and
    // programmatic updates alike; intermediate drag frames arrive with
    // `dragging: true`, and persisting those puts a commit on every frame.
    onNodesChange(changes) {
      for (const change of changes) {
        if (change.type !== 'position' || change.dragging === true || !change.position) {
          continue
        }
        const node = this.nodes.find((n) => n.id === change.id)
        if (node) {
          node.position = { ...change.position }
        }
      }
    },
    onConnect({ source, target }) {
      const id = `${source}-${target}`
      if (!this.edges.some((e) => e.id === id)) {
        this.edges.push({ id, source, target })
      }
    },
    // Delete/Backspace on a focused node. The canvas removes nothing itself —
    // drop the edges too, or they point at a node that is gone.
    onNodeRemove(id) {
      this.nodes = this.nodes.filter((n) => n.id !== id)
      this.edges = this.edges.filter((e) => e.source !== id && e.target !== id)
    },
  },
```

In a real editor the `node` slot renders your own component — a status card, a
step row — and `onNodeMove` / `onConnect` persist through your store instead of
mutating local state.

## Coordinates

Nodes carry Vue Flow's `position: { x, y }` in canvas space — the node's **top-left corner**. Vue Flow owns the pan/zoom transform, so you never convert screen coordinates yourself.

`nodeWidth` / `nodeHeight` are **gone**. They existed only so hand-drawn edges could guess where a node's centre was, and the old documentation admitted the failure mode: *"set them to match what your node slot actually renders, or edges will attach off-centre"*. Vue Flow measures the rendered node, so the whole class of bug went with the props.

## Positions are yours

The canvas never mutates `nodes`. Moves arrive on `@nodes-change` as Vue Flow's change stream and stop there — you decide whether to accept, clamp, snap or persist them. That keeps the canvas usable against an OpenRegister-backed store, a local draft, or a read-only view without changing the component.

⚠️ One change stream covers drags, keyboard moves and programmatic updates alike. Intermediate drag frames arrive with `dragging: true`; persisting those puts a store commit on every animation frame, so filter for the settled position.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `nodes` | `Array` | *required* | Vue Flow's shape: `{ id, type, position: { x, y }, data }`. Put your domain object on `data`; `data.label` becomes the node's accessible name, and `data.ports` declares its exits. |
| `edges` | `Array` | *required* | Vue Flow's shape: `{ id, source, target }`. |
| `readOnly` | `Boolean` | `false` | Refuses dragging, connecting **and** selection. Pan and zoom stay live so the graph is still explorable. |
| `fitView` | `Boolean` | `true` | Frame the whole graph on first render, instead of computing a viewBox by hand. |
| `snapToGrid` | `Boolean` | `true` | Snap dragged nodes to `snapGrid`. |
| `snapGrid` | `Array` | `[16, 16]` | Grid spacing as Vue Flow's `[x, y]`. |
| `minZoom` | `Number` | `0.2` | Lower clamp. |
| `maxZoom` | `Number` | `2` | Upper clamp. |
| `connectionMode` | `String` | `'loose'` | Vue Flow's connection mode — `loose` or `strict`. |
| `showBackground` | `Boolean` | `true` | Draw the dotted background. |
| `showControls` | `Boolean` | `true` | Draw the zoom / fit controls. These are **ours**, not `@vue-flow/controls`, which renders unlabelled buttons that axe flags as `button-name`. |
| `showMiniMap` | `Boolean` | `false` | Draw the minimap. |

### Props that no longer exist

`nodeWidth` and `nodeHeight` are **gone**. They existed only so hand-drawn edges could guess a node's centre, and the previous version of this page warned that edges attach off-centre if you set them wrong. Vue Flow measures the rendered node, so the whole class of bug went with the props.

`viewBox`, `zoom`/`update:zoom`, `showGrid`, `gridSize` and `connectable` are replaced by `fitView`, the viewport props, `<Background>` + `snapGrid`, and `connectionMode` respectively.

## Events

| Event | Payload | When |
|---|---|---|
| `nodes-change` | Vue Flow's change array | Position, selection, dimension and removal changes. The canvas **applies none of them** — see *Positions are yours*. Drag frames carry `dragging: true`. |
| `edges-change` | Vue Flow's change array | The same contract for edges: reported, never applied. |
| `connect` | `{ source, target, sourceHandle, targetHandle }` | A connection was made — by dragging from a port, or with the keyboard (`c` on the source, `c` on the target). The handles are the **port ids you declared**; see *Ports and handle ids*. |
| `canvas-drop` | `{ position, event }` | Something was dropped onto the canvas. `position` is already in canvas space (pan/zoom undone); `event` is the native `DragEvent`, so you can read `dataTransfer`. The canvas does not add the node — you do. |
| `node-select` | Vue Flow's `{ node, event }` | A node was clicked. A host tracking bare ids reads `event.node.id`; `event.event` is the pointer event, which is what a context menu needs to position itself. |
| `edge-select` | Vue Flow's `{ edge, event }` | An edge was clicked. Same shape. |
| `edge-label-move` | `{ id, labelT }` | A connection's label was slid along its line, by pointer or by arrow key. `labelT` is a clamped **fraction** of the way along, never a pixel — store it and feed it back as `data.labelT`. |
| `edge-label-click` | `id` | A connection's label was activated. |
| `edge-label-context` | `{ id, event }` | A connection's label was right-clicked. Hosts open the same menu they open for the line. |
| `canvas-click` | The pointer event | Empty pane was clicked. Consumers usually clear selection. |
| `node-remove` | `id` | Delete or Backspace was pressed on a focused node. The canvas removes **nothing** — you own `nodes` and `edges`, and a node dropped without its edges leaves lines pointing at something that is gone. Not raised on a read-only canvas. |

## Slots

| Slot | Bindings | Notes |
|---|---|---|
| `node` | `{ node }` — its `id`, `data` and `selected` | Renders a step's body. The focusable wrapper, the ARIA state and the keyboard contract stay the canvas's, so a host cannot replace a focusable node with an inert div. |
| `edge-label` | `{ edge }` — its `id`, `data` and `selected` | The chrome of a connection's label, rendered inside a focusable `<button>` the canvas owns. Render **inert** content. A line whose host renders nothing here draws no label control at all — gated on what the slot *renders*, not on whether it exists, so unnamed lines carry no empty chip. |
| `edge-adornment` | `{ edge }` | A host's own controls **beside** the label. Separate from `edge-label` because that one is a button and a button cannot contain another; a replay's "open the payload that passed along this line" control is the case it exists for. |

The hand-drawn `edge` slot is **gone**. Under it every consumer wrote its own orthogonal router, arrowhead marker and midpoint arithmetic — hermiq's ran to some 200 lines — and each had to be told how big a node was, because SVG cannot ask. Vue Flow routes the line and measures the node, leaving the consumer only the part that was ever app-specific: what the label says.

## Ports and handle ids

`data.hasTarget: false` removes a node's entries; `data.hasSource: false` removes its exits. `data.ports` declares its exits — `[{ id, label }]` — and a node that declares none gets one.

Entries render on the **left and top**, exits on the **right and bottom**, left and right first. A node with several exits puts the first on the right and spreads the rest along the bottom.

⚠️ **One exit is drawn on two sides, so a handle id is not a port id.** Vue Flow keys handles by id and two handles cannot share one, so the side is encoded into the handle's id (`yes__right`). The canvas strips it straight back off before `connect` is emitted, on both the pointer and the keyboard path — a branch recorded as `yes__bottom` would name a port your engine has never heard of. An entry handle reduces to `null`, because a node has exactly one inbound port.

Set `data.hasIncoming` / `data.hasOutgoing` to have unconnected ports drawn as warnings, with the consequence in their `title` and accessible name. Leave them undefined and nothing is flagged — undefined means *not measured*, not *nothing connected*.

## Line rendering

`data.lineType` picks the router per edge — `smoothstep` (default), `straight`, or `default` for a bezier. It travels in `data`, never in `type`: Vue Flow reads `type` to choose the **component** that draws a line, so a router named there means the built-in edge answers and no label or adornment can be attached at all.

Every line carries a slow travelling pulse in the direction of flow, suppressed under `prefers-reduced-motion` and switchable per edge with `data.animated: false`.

An edge's arrowhead is sized to clear the target's port handle — Vue Flow draws the arrow at the path's end, which is exactly where the handle sits, in a layer painted above the edges. At the default size the arrow was drawn on every edge and covered on every edge: present, measurable, and invisible.

## Accessibility

A drag-only canvas is not keyboard-operable — it fails WCAG 2.1 AA 2.1.1, and Vue Flow is pointer-first. So the contract is re-implemented in `CnFlowNode` rather than inherited:

- Nodes are focusable (`tabindex="0"`, `role="button"`, `aria-pressed` reflecting selection).
- **Arrow keys move a focused node** (8 units); **Shift + arrow** takes a coarse step (40 units).
- **`r` toggles resize mode** on a resizable node, so the same arrow keys serve both. The pointer affordance is `@vue-flow/node-resizer`'s, which has no keyboard path of its own.
- **`c` connects without a mouse**: press it on a focused node to arm an exit, `c` on another node to complete, `Escape` to cancel. Pressing `c` again on the *same* node steps through its remaining exits — a mouse picks a branch by pointing at it, and without stepping every branch but the first would be mouse-only. The armed port is **ringed** and marked `aria-pressed`; colour alone is not a state.
- **Delete and Backspace** both remove a focused node, because which one deletes is a platform habit rather than a preference.
- A connection's label is a real `<button>`, and **left/right arrows slide it** along its line.
- `aria-label` comes from the node's `data.label`, falling back to its `id`.
- The zoom/fit controls are **ours**, not `@vue-flow/controls` — the library's are bare buttons with an icon and no accessible name, which axe reports at *serious* impact.

A canvas **must not be your only authoring surface**. Keep a list/form path for the same data.

## Notes

- Vue Flow wraps every `#node-default` in `.vue-flow__node-default`, and its `theme-default.css` gives that wrapper a border, a background and padding — a box around your box. The stylesheet here strips it, in the selected, hover and focus states too. `.cn-flow-node` is the only border a node draws.
- Every Vue Flow plugin ships its own stylesheet and only core's used to be imported. `@vue-flow/node-resizer`'s is what gives a resize control its size and position — without it a resizable node looked exactly like one that is not.
- Colours come from Nextcloud variables throughout, including the arrowhead, which Vue Flow writes as an inline style and which therefore needs `!important` to stay themed rather than a hard-coded hex passed through the marker definition.
