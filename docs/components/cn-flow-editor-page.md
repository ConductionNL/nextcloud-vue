# CnFlowEditorPage

The flow canvas — manifest page type `flow-detail`.

Mounts the shared [`CnFlowDetail`](cn-flow-detail.md) node/edge canvas over OpenRegister's one native flow store (ADR-065, ADR-098), scoped to the owning app. Pair it with a [`CnFlowsPage`](cn-flows-page.md) at `/flows`; this one takes `/flows/:id`.

## Manifest usage

```json
{
  "id": "FlowDetail",
  "route": "/flows/:id",
  "type": "flow-detail",
  "title": "Flow",
  "config": { "app": "dossiq" },
  "sidebarComponent": "FlowDetailSidebar"
}
```

Controls belong in Nextcloud's app sidebar so the canvas keeps the full width — declare `sidebarComponent`, or mount `CnFlowSidebar` yourself. Canvas and sidebar share `useFlowStore`, which is why neither needs props from the other.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `app` | `String` | `null` | The owning app id, stamped on a flow created here so the app-scoped list finds it again. Omit only on the fleet-wide surface. |
| `id` | `String` | `''` | The flow id to open. Defaults to the `id` route param, which is the normal case; pass it explicitly only when mounting outside a route. The literal `new` opens an unsaved flow. |
| `detailRoute` | `String` | `'/flows'` | Route path the editor lives under, used to swap the URL once a new flow gets its server-assigned id. |

## The route swap on first save

A newly created flow gets its id from the server. Without the swap the URL stays on `new`, and a reload lands back on an empty canvas having lost the flow that was just saved.
