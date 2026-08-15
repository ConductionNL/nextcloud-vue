---
sidebar_position: 44
---

# CnGraphCanvas

A generic node/edge canvas: **geometry and interaction only**. It owns pan, zoom, node dragging, and drag-to-connect — and nothing else.

It has no opinion about what a node *means*. No statuses, no steps, no guards, no conditions, no persistence. You supply `nodes` and `edges` as plain geometry and render the bodies through slots.

**Not a flow builder.** Per [ADR-065](https://codeberg.org/Conduction/hydra) this is a shared *renderer*. The palette, property panels, condition editors, validators, and persistence rules that surround a real editor are app-specific and stay in the consuming app — they are roughly 80% of an editor's code and 0% of what is reusable. A canvas that tried to own them would be a forced marriage between apps whose models genuinely differ.

Extracted from procest's `WorkflowEditor.vue`, the only canvas in the fleet that has ever worked in production. Deliberately *not* built on `@vue-flow`: every `@vue-flow/core` release ever published declares a Vue 3 peer dependency, and this library is Vue 2.7. That mistake already cost one app its editor.

## Try it

Drag a node. Drag from a node's handle onto another node to connect them. Scroll
to zoom, drag empty space to pan. Focus a node and use the arrow keys.

```vue
<template>
  <div style="height: 420px; border: 1px solid var(--color-border);">
    <CnGraphCanvas
      :nodes="nodes"
      :edges="edges"
      :selected-node-id="selectedId"
      :zoom.sync="zoom"
      @node-move="onNodeMove"
      @connect="onConnect"
      @node-select="selectedId = $event"
      @canvas-click="selectedId = null">
      <template #node="{ node, selected }">
        <div style="padding: 8px;">
          <strong>{{ node.label }}</strong>
          <div style="color: var(--color-text-maxcontrast); font-size: 0.8em;">
            {{ Math.round(node.x) }}, {{ Math.round(node.y) }}
          </div>
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
      zoom: 1,
      nodes: [
        { id: 'draft', x: 60, y: 60, label: 'Draft' },
        { id: 'review', x: 340, y: 60, label: 'In review' },
        { id: 'approved', x: 340, y: 220, label: 'Approved' },
      ],
      edges: [
        { id: 'e1', source: 'draft', target: 'review' },
      ],
    }
  },
  methods: {
    // Positions are owned by the consumer — the canvas only reports intent.
    onNodeMove({ id, x, y }) {
      const node = this.nodes.find((n) => n.id === id)
      if (node) { this.$set(node, 'x', x); this.$set(node, 'y', y) }
    },
    onConnect({ source, target }) {
      const id = `${source}-${target}`
      if (!this.edges.some((e) => e.id === id)) {
        this.edges.push({ id, source, target })
      }
    },
  },
}
</script>
```

In a real editor the `node` slot renders your own component — a status card, a
step row — and `onNodeMove` / `onConnect` persist through your store instead of
mutating local state.

## Coordinates

Nodes carry canvas-space `x` / `y` — their **top-left corner**. Screen coordinates are converted with `(clientX - rect.left - panOffset.x) / zoom`, so positions stay stable under pan and zoom.

`nodeWidth` and `nodeHeight` exist so edges can find a node's centre. **Set them to match what your node slot actually renders**, or edges will attach off-centre. (The source editor hardcoded `200 × 80`; here it is a prop.)

## Positions are yours

The canvas never mutates `nodes`. Dragging emits `node-move` with the intended position and stops there — you decide whether to accept it, clamp it, snap it to a grid, or persist it. This keeps the canvas usable against an OpenRegister-backed store, a local draft, or a read-only view without changing the component.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `nodes` | `Array` | *required* | `{ id, x, y }` each. Extra keys pass through to the slot untouched — put your domain object on `data`, and a human name on `label` for the accessible name. |
| `edges` | `Array` | `[]` | `{ id, source, target }`, where `source`/`target` are node ids. |
| `nodeWidth` | `Number` | `200` | Rendered node width, in canvas units. Used for edge endpoints. |
| `nodeHeight` | `Number` | `80` | Rendered node height, in canvas units. |
| `selectedNodeId` | `String` | `null` | Selection is owned by the consumer; the canvas only reports intent. |
| `selectedEdgeId` | `String` | `null` | As `selectedNodeId`, for edges. |
| `zoom` | `Number` | `1` | Supports `.sync` via `update:zoom`. |
| `minZoom` | `Number` | `0.3` | Lower clamp for wheel zoom. |
| `maxZoom` | `Number` | `2` | Upper clamp for wheel zoom. |
| `viewBox` | `String` | `'0 0 2000 1500'` | SVG viewBox for the edge layer. Widen it if the graph extends past the default area. |
| `readOnly` | `Boolean` | `false` | Blocks node moves and connections. Pan and zoom stay live so the graph is still explorable. |
| `connectable` | `Boolean` | `true` | Whether nodes expose a connection handle. |
| `resizable` | `Boolean` | `false` | Gives each node a corner grip. The new size arrives as `node-resize`; a node's own `width`/`height` then win over `nodeWidth`/`nodeHeight`. |
| `showGrid` | `Boolean` | `false` | Draws a dot grid behind the graph. The dots pan and zoom with the content, so a dot keeps the same canvas coordinate as the graph moves. |
| `gridSize` | `Number` | `24` | Spacing between grid dots, in canvas units. |

## Events

| Event | Payload | When |
|---|---|---|
| `node-move` | `{ id, x, y }` | A node was dragged, or nudged with the arrow keys. **Not** clamped: a graph has no top-left corner, so a node may sit above or left of the origin. |
| `node-resize` | `{ id, width, height }` | A node was resized by its grip or with the arrow keys on that grip. Sizes are yours to store, exactly as positions are. Never smaller than 40×40. |
| `connect` | `{ source, target }` | A connection was made — by dragging a handle onto a node, or with the keyboard (`c` on the source then `c` on the target). Self-connections are refused. |
| `canvas-drop` | `{ x, y, event }` | Something was dropped onto the canvas. `x`/`y` are in canvas space (pan/zoom undone); `event` is the native `DragEvent`, so you can read `dataTransfer`. The canvas does not add the node — you do. |
| `node-select` | `id` | A node was clicked or focused. |
| `edge-select` | `id` | An edge was clicked (default edge rendering only). |
| `canvas-click` | — | Empty canvas was clicked. Consumers usually clear selection. |
| `update:zoom` | `Number` | Wheel zoom, already clamped to `minZoom`/`maxZoom`. |

## Slots

| Slot | Bindings | Notes |
|---|---|---|
| `node` | `{ node, selected }` | Renders a node's body. The canvas positions the wrapper; the slot fills it. |
| `edge` | `{ edge, from, to, selected }` | Renders one edge inside the SVG layer. `from`/`to` are resolved centres, so you never recompute geometry. Must render SVG. Defaults to a straight arrow-tipped line. |

## Accessibility

A drag-only canvas is not keyboard-operable — it fails WCAG 2.1 AA 2.1.1. So:

- Nodes are focusable (`tabindex="0"`, `role="button"`, `aria-pressed` reflecting selection).
- **Arrow keys move a focused node** (10 units); **Shift + arrow** takes a coarse step (50 units).
- **`c` connects without a mouse**: press it on a focused node to start a connection, `c` on another node to complete it, `Escape` to cancel. The armed source node is marked while pending. This is the keyboard equivalent of dragging a handle.
- `aria-label` comes from the node's `label`, falling back to its `id`.
- Keys other than the arrows, `c`, and `Escape` are ignored, so inputs inside a node slot keep working.

A canvas **must not be your only authoring surface**. Keep a list/form path for the same data.

## Notes

- An edge whose `source` or `target` does not resolve to a node is **dropped, not drawn**. A dangling edge rendered to the origin reads as a rendering bug rather than as bad data — which is exactly how one earlier canvas hid a schema mismatch.
- Node bodies sit above the edge layer, so node content stays clickable. Edges opt back into hit-testing individually.
- Releasing the pointer outside the viewport ends the drag (`mouseleave`), so a node cannot get stuck to the cursor.
