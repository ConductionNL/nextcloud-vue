# EDGE_LINE_TYPES

The routers a flow connection may be drawn with — the single list every reader
and writer of `edge.lineType` shares.

```js
import { EDGE_LINE_TYPES } from '@conduction/nextcloud-vue'

EDGE_LINE_TYPES.map((style) => ({ id: style.id, label: style.label() }))
// [{ id: 'smoothstep', label: 'Angled' },
//  { id: 'straight',   label: 'Straight' },
//  { id: 'default',    label: 'Curved' }]
```

| `id` | Label | Path |
|------|-------|------|
| `smoothstep` | Angled | Orthogonal segments with rounded corners. The default. |
| `straight` | Straight | A direct line between the two ports. |
| `default` | Curved | Vue Flow's bezier. |

## Labels are functions, not strings

`t()` has to run **after** the locale is available, and a module-level constant
evaluates at import time — before a Nextcloud page has installed its
translations. A string here would pin every label to English for the life of the
bundle, so each entry exposes `label()` and callers invoke it where they render.

## Why it is one list

`useFlowStore.canvasEdges` reads `edge.lineType`,
[`CnFlowEdge`](../components/cn-graph-canvas.md) switches on it, and both the
line context menu and [`CnFlowEdgeEditModal`](../components/cn-flow-edge-edit-modal.md)
now write it. Three readers and two writers of one closed vocabulary is the
shape that drifts: a router offered by a menu but unknown to the edge would draw
as the default and the control would silently do nothing.

See also [`DEFAULT_EDGE_LINE_TYPE`](./default-edge-line-type.md).
