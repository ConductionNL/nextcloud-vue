---
sidebar_position: 45
---

# CnFlowDetail

The **canvas half** of the flow editor. Geometry and interaction come from [`CnGraphCanvas`](./cn-graph-canvas.md); this component supplies typed step cards, directional edge routing, and the editor **toolbar** — Save, Run, Check, arrange, and zoom — over OpenRegister's flow store. The actions that concern the graph live on the graph.

Pair it with [`CnFlowSidebar`](./cn-flow-sidebar.md), which holds the palette, step configuration and flow settings. The two render in different parts of the tree — the page body and Nextcloud's app sidebar — so they share `useFlowStore` rather than passing props.

```vue
<template>
  <CnFlowDetail :id="$route.params.id" app="openconnector" @save="onSave" @run="onRun" />
</template>
```

## Props

| Prop | Type | Default | What it does |
|---|---|---|---|
| `id` | `String` | `null` | The flow uuid to open. The literal `new` starts a flow holding only the manual-trigger start node, so creating and editing share one page **and one look**. |
| `app` | `String` | `null` | The owning app id. Scopes the list and is stamped on a new flow. |

## Events

| Event | When |
|---|---|
| `save` | The toolbar's Save was pressed. The host persists via `useFlowStore().save()` and, for a new flow, swaps the route to the minted id — only the host knows whether a route swap is needed. |
| `run` | The toolbar's Run was pressed. The host queues a run via `useFlowStore().run()`. |

## The toolbar

Save is enabled once the flow has a name; Run once it has been stored (the engine runs the **stored** flow, not the unsaved canvas). **Check** posts the canvas to `POST /api/flow/validate` — the engine's own preflight, without saving — and renders the verdict as a note card on the canvas; a refusal still carries the preflight's report and is shown as the verdict it is, never as a transport error. **Arrange** (`autoSort`) re-lays the nodes left-to-right by how the flow actually runs, changing coordinates and nothing else. Zoom steps the same factor the mouse wheel drives. **Undo** steps the graph back one edit, and `Ctrl+Z` / `Cmd+Z` does the same from anywhere in the editor. It stands down for editable text and while a step's dialog is open: reverting the whole graph because someone undid a typo would be worse than having no undo. There is a button as well as the shortcut — a shortcut nobody is told about is a feature only its author has. When the sidebar is closed, a **Show the flow controls** button appears here — the way back cannot live in the sidebar itself.

## Removing a step

`Delete` or `Backspace` on a focused step removes it — both keys, because which one deletes is a platform habit rather than a preference, and a Mac user does not think of Backspace as the alternative. The edges pointing at that step go with it: a graph that kept them would carry lines to a step that no longer exists, and the engine would refuse the document at run time.

Undo brings the step **and its edges** back. A read-only canvas refuses the keys entirely.

## Where a line may enter and leave a step

Ports say what the engine will accept, so they follow the step's **catalogue role**:

| Role | Entries | Exits |
|------|---------|-------|
| `trigger` | none — a run *starts* here | right, bottom |
| `step` | left, top | right, bottom |
| `end` | left, top | none — the flow *stops* here |

## Opening a flow that has no layout

A flow can arrive without any node positions. Flows declared in a schema's `x-openregister-flows` are the main case: they are imported, published at once, and carry no coordinates. Rendered as stored, every node lands on one point.

The store lays such a flow out before the canvas renders it. Triggers sit left. Every step sits one column past the furthest step that leads to it. Branches keep their own rows. A loop back to an earlier step is drawn, but never stretches the layout. The result is deterministic: the same flow opens looking the same, every time.

Positions that exist but all sit on one identical point count as no layout. Some importers stamp `0,0` on every node, and that is the same pile with numbers written down.

Three rules protect work the author did:

- A flow with two or more distinct node positions opens exactly as saved.
- Nodes without a position in such a flow slot beneath it, in run order.
- The computed layout is never saved by itself. The flow stays clean on open, so a viewer changes nothing, and a published flow stays pure. When an author edits a draft and saves, the coordinates travel along.

**Left and right are primary.** `autoSort` lays a flow out left to right, one column per depth, and Vue Flow attaches an edge that names no handle to the first handle of its type — so a line drawn without aiming at a specific port leaves the right edge and arrives on the left. Top and bottom are there for a graph the author routes by hand.

A routing step with several branches puts its **first** exit on the right and spreads the rest along the bottom, which is the one side with room for several.

Every port draws a small arrow, and all four point *with* the flow: an entry on the left and an exit on the right both point right; an entry on top and an exit on the bottom both point down. The node then reads as one direction rather than as four separate claims.

### An unconnected port warns where it breaks

A port that is drawn but wired to nothing turns warning-coloured and carries a tooltip saying what the engine will do — "Nothing connects to this step, so the flow will never reach it", or "Nothing leaves this step, so the flow stops here". The same finding **Check** returns, but at the port the author can act on rather than as a node id in a card on the other side of the screen.

The state is never colour alone: the consequence is in both the `title` and the port's accessible name.

A host that does not measure connectedness (any plain [`CnGraphCanvas`](./cn-graph-canvas.md) consumer) gets no warnings at all — undefined means *not measured*, not *nothing connected*.

## Acting on a connection

Clicking a line opens its own action menu, next to the pointer:

| Action | Effect |
|--------|--------|
| **Edit label** | Opens [`CnFlowEdgeEditModal`](./cn-flow-edge-edit-modal.md) — the line's label and its router. |
| **Angled / Straight / Curved** | Re-routes this one line. The router it already uses is shown *disabled*, so the menu states the current value instead of hiding it behind a click. |
| **Copy** | Copies the line's label and router. A connection has no useful *duplicate* — two records with the same endpoints draw on top of each other and `connect()` refuses the second — so Copy takes the part that is worth repeating. |
| **Paste style** | Applies a copied label and router. Only offered once something has been copied. |
| **Delete** | Removes this connection. Undoable; the steps at either end are untouched. |

A line's **label** is a control too: clicking it opens the connection dialog, and right-clicking it opens the same menu as the line. An unlabelled line draws no chip at all — a blank chip reads as a connection whose name is empty rather than one that never had a name.

Every one of these is keyed on the connection's **endpoints**, never on an id, and setting a field on one line of a multi-line record splits it out first. [`CnFlowEdgeEditModal`](./cn-flow-edge-edit-modal.md) explains why.

## Editing a step

Double-clicking a node — or the sidebar's **Edit step…** button — opens [`CnFlowNodeEditModal`](./cn-flow-node-edit-modal.md), hosted by this component so it exists wherever the canvas does. Node cards draw as **one** container: the canvas wrapper owns the box (border, radius, selection) and the card only fills it, carrying the role accent.

## A new flow starts with a starting point

`/flows/new` renders the same canvas as an existing flow, seeded with the engine's manual trigger (`openregister.trigger-manual`, "When someone runs it") — never an empty page that looks like a different surface. If the instance's engine really does not know that node, the card wears the ordinary "Unknown step" warning.

## Step types come from the engine, and only from the engine

Every label, class and configuration pane keys on the **catalogue id exactly as the node registry publishes it** — `openregister.set-fields`, `hermiq.agent-step`. Never a bare id.

This is not a style preference. The builder this was ported from drew its palette from the catalogue (namespaced) and then matched bare ids everywhere else, so every step placed from the palette had no configuration pane and was **skipped at run time while the run reported success**. A second vocabulary anywhere in this component reintroduces that.

A step the catalogue cannot explain is drawn with an error border and an "Unknown step" badge, because a flow that looks correct on the canvas and dies when it runs is the failure being removed.

An **empty** catalogue means it could not be read — not that every step is unknown — so nothing is flagged in that case.

## Edge routing

Vue Flow routes every edge (`smoothstep` — orthogonal with rounded corners), measuring the rendered node rather than being told its size. The hand-drawn geometry this replaced is gone, along with the `nodeWidth`/`nodeHeight` props it needed to guess a node's centre from.

Each edge ends in an **arrowhead**, because direction is the one thing a line cannot express on its own. It is sized to clear the target's port handle: Vue Flow draws the arrow at the path's end, which is exactly where the handle sits, and the handle is painted in a layer above the edges. At the default size the arrowhead was rendered on every edge and covered on every edge — present, measurable, and invisible. Its colour comes from `--color-text-maxcontrast` in CSS rather than from the marker definition, so it follows the theme into dark mode.

A slow **travelling pulse** runs along every line in the direction of flow. The arrowhead states the direction at one end; on a graph with crossings that is the one place a reader has to find before they can follow anything, and on a long line it is the far end from where their eye already is. The pulse is a second path over the line, so the line itself stays solid.

It is suppressed entirely — not merely paused — under `prefers-reduced-motion`, because a paused dash pattern freezes wherever it stood and leaves the line looking like a second, dotted connection. A host can also switch it off per edge with `data.animated === false`.

## Notes

- A namespaced id becomes a CSS class via `typeSlug()`. A dot mid-class is a compound selector rather than a name, so an unslugged accent silently matches nothing.
- The step summary describes whatever configuration is actually set, so it works for every step type present and future — including ones added by an app this library has never heard of.
- Cards carry a **role accent** keyed on the catalogue's `role` — trigger (green), step (primary), end (red) — drawn as an inset box-shadow on the **node's own border**, so the accent adds no layout width and draws no second edge inside the first. It used to sit on the card *inside* the node wrapper, a few pixels in from that wrapper's border, which is what made a step read as a card inside a card. Never keyed on graph position, which once painted unconnected steps green.
- Edges are drawn from `useFlowStore().canvasEdges`, which accepts both edge dialects (`{source, target}` and the engine's `{from, to}`, list endpoints included) — handing `flow.edges` to the canvas raw rendered every hermiq-stored flow as unconnected cards.
