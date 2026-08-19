---
sidebar_position: 46
---

# CnFlowSidebar

The **controls half** of the flow editor — Nextcloud's own `NcAppSidebar`, with three tabs: **Steps** (the searchable palette and the selected step), **Runs** (history and per-step traces), **Flow** (the flow's own settings, plus the unsaved-changes and missing-trigger/end banners). Render it in Nextcloud's app sidebar so [`CnFlowDetail`](./cn-flow-detail.md) keeps the full width; the header carries the flow's name and its trigger.

Save and Run moved to `CnFlowDetail`'s toolbar — the actions that concern the graph live on the graph. The selected step is edited through [`CnFlowNodeEditModal`](./cn-flow-node-edit-modal.md) (the **Edit step…** button), not an inline JSON textarea. Closing the sidebar sets `useFlowStore().sidebarOpen = false`; the canvas toolbar offers the way back, because a control to bring the sidebar back cannot live in the sidebar.

```vue
<template>
  <CnFlowSidebar />
</template>
```

## Props

| Prop | Type | Default | What it does |
|---|---|---|---|
| `embedded` | `Boolean` | `false` | Render the tabs without `NcAppSidebar` chrome — for hosts that are not the app layout. `CnFlowEditModal` sets it: an app sidebar's positioning has no meaning inside a dialog. |

## Events

| Event | When |
|---|---|
| `save` | **Deprecated** — nothing fires it any more. Listen on `CnFlowDetail`'s `save` instead. |
| `run` | **Deprecated** — listen on `CnFlowDetail`'s `run` instead. |

## The palette is the engine's catalogue, and nothing else

A builder that offers a step the engine has never heard of produces a flow that cannot run. An **empty palette here means the catalogue could not be read** — a visible, diagnosable state — never a hard-coded fallback list that might disagree with the engine. While the catalogue is still **loading** the palette says so: an in-flight request and a failed one are different states, and showing the failure text during the first paint of `/flows/new` taught every user to distrust it.

Entries are searchable (name, id and description), filterable by role, and sorted triggers → steps → end, each carrying its role as a badge and its description in place.

## Step configuration lives in a dialog

The selected step shows its catalogue description and an **Edit step…** button opening [`CnFlowNodeEditModal`](./cn-flow-node-edit-modal.md) — a real form derived from the engine's `configKeys`, with an Advanced JSON escape hatch. See that page for why the widgets are derived rather than hand-written per step type.

## Enabled is not the same as "will run"

A trigger fires with no acting user, so a flow with no owner has no identity to execute as and will not start however enabled it looks. The sidebar says so rather than letting a dead flow look healthy.

## Notes

- Selecting a different step resets the configuration draft, so a half-finished edit does not leak onto the next step.
- Run history lists recent runs; opening one shows its **per-step** rows, which is what the run's aggregate log cannot answer without being walked.
