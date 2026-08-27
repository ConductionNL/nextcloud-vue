---
sidebar_position: 49
---

# CnFlowEdgeEditModal

Edit one **connection** between two steps — what it is called, and how it is
drawn.

Until this existed a line was the one thing on the flow canvas that could be
created and then never touched again. Selecting it did nothing, so renaming a
branch, re-routing an awkward line, or removing a connection all meant deleting
a step and drawing the graph again.

```vue
<!-- Hosted by CnFlowDetail; open it by naming the two ends: -->
useFlowStore().editingEdge = { source: 'a', target: 'b' }
```

## Opening it

- **Edit label** in the line's context menu on the
  [`CnFlowDetail`](./cn-flow-detail.md) canvas.
- Clicking a line's **label**, when it has one.
- Programmatically: set `useFlowStore().editingEdge`.

## What it edits

| Field | Stored as | Effect |
|-------|-----------|--------|
| Label | `edge.title` | Drawn on the line as a chip. An empty label draws no chip at all — an unnamed connection is not a connection whose name is blank. |
| Line style | `edge.lineType` | Which router draws the path: **Angled** (`smoothstep`, the default), **Straight** (`straight`) or **Curved** (`default`). The vocabulary is [`EDGE_LINE_TYPES`](../utilities/edge-line-types.md). |

**Remove connection** deletes the line and closes the dialog.

## Draft semantics

Edits land on a draft. **Done** commits both fields as a *single* store change,
so one Ctrl+Z reverses one edit; **Cancel** discards them. Same contract as
[`CnFlowNodeEditModal`](./cn-flow-node-edit-modal.md).

## Why a connection is identified by its endpoints, never by an id

A stored edge may draw **several lines**. `{ from: 'a', to: ['b', 'c'] }` is one
record and two connections, and `useFlowStore.canvasEdges` expands it into two
drawn lines whose ids are synthesised per render — they mean nothing to the
saved document. The endpoint pair is the only identity both halves share, so
every edge action on the store (`removeEdge`, `setEdgeFields`, `copyEdgeStyle`,
`pasteEdgeStyle`) is keyed on `{ source, target }`.

That has a consequence worth knowing: setting a field on one line of a
multi-line record **splits it out** into a record of its own first. Writing
`lineType` straight onto the shared record would restyle every line it draws,
from a control the author opened on one of them.
