# CnFlowsPage

The app-scoped flow list — manifest page type `flows`.

Every app authors its own flows (ADR-110 Decision 4): a dossiq flow operates on cases, a shillinq flow on budget lines, so the authoring surface belongs in the app whose objects it drives rather than behind a deep link to another app's list. The **engine stays single** (ADR-065) — this is a scoped view onto OpenRegister's one native flow store, not a per-app store.

Built on [`CnIndexPage`](cn-index-page.md) per ADR-096, and deliberately **not** on the deprecated `CnFlowIndexPage`: a flow list is an ordinary index surface. The source is external (`:objects` from `useFlowStore`) because a flow is not an OpenRegister object — there is no register/schema pair for a `type: "index"` page to bind to, which is exactly why this needs its own page type.

## Manifest usage

```json
{
  "id": "Flows",
  "route": "/flows",
  "type": "flows",
  "title": "Flows",
  "config": { "app": "dossiq" }
}
```

Pair it with a [`CnFlowEditorPage`](cn-flow-editor-page.md) at `/flows/:id`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `app` | `String` | `null` | The owning app id this list is scoped to. Omit to list every app's flows — the fleet-wide view OpenRegister uses. A leaf app should always set it, or it shows other apps' automations as its own. |
| `title` | `String` | `''` | Page heading. Defaults to a translated "Flows". |
| `description` | `String` | `''` | Page description. Defaults to a translated one-line explanation of what a flow is. |
| `detailRoute` | `String` | `'/flows'` | Route path the list navigates to for a flow, with `/<id>` appended. Change only if the detail page is mounted somewhere other than the conventional `/flows/:id`. |

## Why the status column says more than "Enabled"

Enabled and dispatchable are not the same thing. A trigger fires with no acting user, so a flow with **no owner has no identity to run as** and will not start however enabled it looks. The list renders `Enabled, but has no owner — it will not start` for that case: it is the only place a user finds out before waiting for a run that never comes.
