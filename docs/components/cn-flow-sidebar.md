---
sidebar_position: 46
---

# CnFlowSidebar

The **controls half** of the flow editor, in three tabs: **Steps** (the searchable palette and the selected step's configuration), **Runs** (history and per-step traces), **Flow** (the flow's own settings, plus the unsaved-changes and missing-trigger/end banners). Render it in Nextcloud's app sidebar so [`CnFlowDetail`](./cn-flow-detail.md) keeps the full width.

Save and Run moved to `CnFlowDetail`'s toolbar — the actions that concern the graph live on the graph.

```vue
<template>
  <CnFlowSidebar />
</template>
```

## Events

| Event | When |
|---|---|
| `save` | **Deprecated** — nothing fires it any more. Listen on `CnFlowDetail`'s `save` instead. |
| `run` | **Deprecated** — listen on `CnFlowDetail`'s `run` instead. |

## The palette is the engine's catalogue, and nothing else

A builder that offers a step the engine has never heard of produces a flow that cannot run. An **empty palette here means the catalogue could not be read** — a visible, diagnosable state — never a hard-coded fallback list that might disagree with the engine. While the catalogue is still **loading** the palette says so: an in-flight request and a failed one are different states, and showing the failure text during the first paint of `/flows/new` taught every user to distrust it.

Entries are searchable (name, id and description), filterable by role, and sorted triggers → steps → end, each carrying its role as a badge and its description in place.

## Configuration is edited as JSON, deliberately

The catalogue publishes each step's id, name, description and icon — but **no schema for its configuration**. A typed form could therefore only be hand-written per step type, which is exactly how the previous builder ended up understanding four step types and silently ignoring every other app's.

An in-progress edit that does not parse leaves the step's **last valid configuration** in place rather than writing a broken one, and says so.

## Enabled is not the same as "will run"

A trigger fires with no acting user, so a flow with no owner has no identity to execute as and will not start however enabled it looks. The sidebar says so rather than letting a dead flow look healthy.

## Notes

- Selecting a different step resets the configuration draft, so a half-finished edit does not leak onto the next step.
- Run history lists recent runs; opening one shows its **per-step** rows, which is what the run's aggregate log cannot answer without being walked.
