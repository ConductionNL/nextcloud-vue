---
sidebar_position: 46
---

# CnFlowSidebar

The **controls half** of the flow editor: palette, per-step configuration, flow settings, run history and Save/Run. Render it in Nextcloud's app sidebar so [`CnFlowDetail`](./cn-flow-detail.md) keeps the full width.

```vue
<template>
  <CnFlowSidebar @save="onSave" @run="onRun" />
</template>
```

## Events

| Event | When |
|---|---|
| `save` | The author asked to store the flow. |
| `run` | The author asked to run it now. |

## The palette is the engine's catalogue, and nothing else

A builder that offers a step the engine has never heard of produces a flow that cannot run. An **empty palette here means the catalogue could not be read** — a visible, diagnosable state — never a hard-coded fallback list that might disagree with the engine.

## Configuration is edited as JSON, deliberately

The catalogue publishes each step's id, name, description and icon — but **no schema for its configuration**. A typed form could therefore only be hand-written per step type, which is exactly how the previous builder ended up understanding four step types and silently ignoring every other app's.

An in-progress edit that does not parse leaves the step's **last valid configuration** in place rather than writing a broken one, and says so.

## Enabled is not the same as "will run"

A trigger fires with no acting user, so a flow with no owner has no identity to execute as and will not start however enabled it looks. The sidebar says so rather than letting a dead flow look healthy.

## Notes

- Selecting a different step resets the configuration draft, so a half-finished edit does not leak onto the next step.
- Run history lists recent runs; opening one shows its **per-step** rows, which is what the run's aggregate log cannot answer without being walked.
