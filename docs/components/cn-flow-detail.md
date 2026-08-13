---
sidebar_position: 45
---

# CnFlowDetail

The **canvas half** of the flow editor. Geometry and interaction come from [`CnGraphCanvas`](./cn-graph-canvas.md); this component supplies typed step cards and directional edge routing over OpenRegister's flow store.

Pair it with [`CnFlowSidebar`](./cn-flow-sidebar.md), which holds every control. The two render in different parts of the tree — the page body and Nextcloud's app sidebar — so they share `useFlowStore` rather than passing props.

```vue
<template>
  <CnFlowDetail :id="$route.params.id" app="openconnector" />
</template>
```

## Props

| Prop | Type | Default | What it does |
|---|---|---|---|
| `id` | `String` | `null` | The flow uuid to open. The literal `new` starts a blank flow, so creating and editing share one page. |
| `app` | `String` | `null` | The owning app id. Scopes the list and is stamped on a new flow. |

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
