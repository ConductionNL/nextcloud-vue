---
sidebar_position: 48
---

# CnFlowEditModal

Edit a flow **without leaving the page**. This is what OpenBuild's "Edit flows…" opens.

```vue
<template>
  <CnFlowEditModal
    v-if="editing"
    :flow-id="editing"
    app="openbuild"
    @saved="onSaved"
    @close="editing = null" />
</template>
```

## Props

| Prop | Type | Default | What it does |
|---|---|---|---|
| `flowId` | `String` | `'new'` | The flow to edit. `new` starts a blank one. |
| `app` | `String` | `null` | The owning app id, stamped on a new flow. |

## Events

| Event | Payload | When |
|---|---|---|
| `saved` | the stored flow | A save succeeded. |
| `close` | — | The dialog should be dismissed. |

## Replaces the action-list editors

This supersedes `CnEditFlowsModal`, `CnFlowCanvas` and `CnFlowCanvasModal`, all removed. They edited a schema's `x-openregister-flows` as a flat `{name, trigger, actions[]}` list via `PATCH /api/schemas/{id}`. The service that executed that dialect is gone, and `x-openregister-flows` now declares node/edge **engine** flows — so those editors wrote configuration nothing reads, without failing loudly.

If you imported any of them, import `CnFlowEditModal` instead.

## It hosts the real editor, not a simpler one

The modal renders the **same** [`CnFlowDetail`](./cn-flow-detail.md) and [`CnFlowSidebar`](./cn-flow-sidebar.md) as the full page. A modal that could only edit a flow's name would quietly become a second product surface, and the two would drift until the same flow behaved differently depending on where you opened it.

`size="full"` because a graph needs the room: the canvas and the controls have to be on screen together, and at any smaller size the sidebar either wraps under the canvas or squeezes it to a strip.

## Closing with unsaved work asks first

The canvas holds step positions and configuration that exist nowhere else until saved, so dismissing a dirty flow is the one destructive thing this dialog can do. It confirms rather than discarding silently.
