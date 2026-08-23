---
sidebar_position: 47
---

# CnFlowIndexPage

:::caution Deprecated
A flow list is an ordinary index surface and belongs on [`CnIndexPage`](./cn-index-page.md) — columns plus the external `:objects` prop fed from `useFlowStore().flows` — per **ADR-096**. This bespoke table stays rendering so existing consumers do not break, but new pages must not use it; see hermiq's `FlowIndex.vue` (or openregister's `FlowsIndex.vue`) for the CnIndexPage template.
:::

The **browse surface** over OpenRegister's one flow store.

```vue
<template>
  <CnFlowIndexPage
    app="openconnector"
    @open="flow => $router.push({ name: 'FlowDetail', params: { id: flow.id } })"
    @create="$router.push({ name: 'FlowDetail', params: { id: 'new' } })" />
</template>
```

## Props

| Prop | Type | Default | What it does |
|---|---|---|---|
| `app` | `String` | `null` | Restrict to one owning app id. `null` lists **every** app's flows. |

## Events

| Event | Payload | When |
|---|---|---|
| `open` | the flow | A row was activated. |
| `create` | — | "New flow" was pressed. |

## One prop replaces a register per app

Integriq passes `openconnector` and sees its own; Hermiq passes `hermiq`; OpenRegister passes nothing and sees everything. That single prop is what replaces "a flow register per app" — the arrangement that previously forced a resolver to arbitrate between per-app stores, and let two apps disagree about who owned a flow id.

## Status tells you whether it will actually run

`Enabled` and *will run* are not the same thing, and the difference is the most confusing state a flow can be in. A trigger fires with no acting user, so a flow with **no owner** has no identity to run as and will not start — however enabled it looks. The status column says exactly that rather than showing a green "Enabled" on a flow that never fires.

## Notes

- A failed load says the flows **could not be read**, not that there are none. An empty list and an unreadable one are different facts and must not render identically.
- The app column is hidden when the list is already scoped to one app.
