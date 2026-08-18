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

Save is enabled once the flow has a name; Run once it has been stored (the engine runs the **stored** flow, not the unsaved canvas). **Check** posts the canvas to `POST /api/flow/validate` — the engine's own preflight, without saving — and renders the verdict as a note card on the canvas; a refusal still carries the preflight's report and is shown as the verdict it is, never as a transport error. **Arrange** (`autoSort`) re-lays the nodes left-to-right by how the flow actually runs, changing coordinates and nothing else. Zoom steps the same factor the mouse wheel drives.

## A new flow starts with a starting point

`/flows/new` renders the same canvas as an existing flow, seeded with the engine's manual trigger (`openregister.trigger-manual`, "When someone runs it") — never an empty page that looks like a different surface. If the instance's engine really does not know that node, the card wears the ordinary "Unknown step" warning.

## Step types come from the engine, and only from the engine

Every label, class and configuration pane keys on the **catalogue id exactly as the node registry publishes it** — `openregister.set-fields`, `hermiq.agent-step`. Never a bare id.

This is not a style preference. The builder this was ported from drew its palette from the catalogue (namespaced) and then matched bare ids everywhere else, so every step placed from the palette had no configuration pane and was **skipped at run time while the run reported success**. A second vocabulary anywhere in this component reintroduces that.

A step the catalogue cannot explain is drawn with an error border and an "Unknown step" badge, because a flow that looks correct on the canvas and dies when it runs is the failure being removed.

An **empty** catalogue means it could not be read — not that every step is unknown — so nothing is flagged in that case.

## Edge routing

Edges are trimmed from node centres back to the borders, so the arrowhead is not hidden under the target card, and they bend **only when a straight run genuinely does not fit**. Bending on any difference in centres produced a staircase for a modest offset and, for a near-aligned pair, two corner arcs with a zero-length leg between them — a visible wobble in place of a line. A corner should mean "these steps are not in line", not "these steps are a few pixels apart".

## Notes

- A namespaced id becomes a CSS class via `typeSlug()`. A dot mid-class is a compound selector rather than a name, so an unslugged accent silently matches nothing.
- The step summary describes whatever configuration is actually set, so it works for every step type present and future — including ones added by an app this library has never heard of.
- Cards carry a **role accent** keyed on the catalogue's `role` — trigger (green), step (primary), end (red) — drawn with an inset box-shadow so the accent adds no layout width. Never keyed on graph position, which once painted unconnected steps green.
- Edges are drawn from `useFlowStore().canvasEdges`, which accepts both edge dialects (`{source, target}` and the engine's `{from, to}`, list endpoints included) — handing `flow.edges` to the canvas raw rendered every hermiq-stored flow as unconnected cards.
