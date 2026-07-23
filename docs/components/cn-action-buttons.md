# CnActionButtons

The declarative **header-actions surface** (#91 Wave 3). Renders a page's
`headerActions[]` as buttons and owns the two action behaviours the
one-shot [`dispatchAction`](../utilities/dispatch-action.md) can't provide
alone: a schema-driven **create dialog** (`open-form`) and a stateful
two-way **toggle**. Every other action type routes through the shared
dispatcher — with a confirm gate first when the action asks for it.

`CnDashboardPage` and `CnDetailPage` mount this automatically from their
`headerActions` prop (which `CnPageRenderer` fills from
`pages[].config.headerActions`); you rarely instantiate it directly.

## Action types

| `type` | Behaviour |
|--------|-----------|
| `open-form` | Fetches the action's `schema` through the object store and mounts `CnAdvancedFormDialog`; saves the new object on confirm, toasts, bumps `cn:page:refresh`, and navigates to `onSuccessRoute` when set. |
| `toggle` | Two-way state button: GETs `stateSource` on mount, renders `labelOn` / `labelOff`, and on click writes the flipped value **optimistically** (reverting on failure). |
| `api-call` | POST/PUT `url` + success/error toast + page refresh — via `dispatchAction`. `payload` (preferred, deep @-token resolution) or `params` (legacy, shallow) supplies the JSON body; `download: true` requests a blob response and triggers a browser file download instead (no auto-refresh unless `refresh: true`). See [dispatchAction](../utilities/dispatch-action.md#api-call-wave-3-91). |
| `navigate` / `open-page` / `open-modal` / `refresh` / `handler` | Routed through `dispatchAction` (the pre-bound `cnDispatchAction` when mounted under `CnPageRenderer`). |

Every action may carry a **`visibleWhen`** predicate (the shared banner
shape — `{ endpoint \| source \| field, op, value }`) evaluated against the
page / object context. A hidden action simply doesn't render. The
`field`-only *local* form gates on the loaded record
(`{ field: "state", op: "eq", value: "pending" }`), so a detail action can
show only in the right lifecycle state — no request.

A `confirm: true` action opens `CnConfirmDialog` **before** dispatching
(the object-op precedent).

## Config

```jsonc
"headerActions": [
  { "id": "new-lead", "label": "New lead", "type": "open-form",
    "register": "crm", "schema": "lead", "onSuccessRoute": "Leads", "variant": "primary" },

  { "id": "approve", "label": "Approve", "type": "api-call",
    "url": "/apps/shillinq/api/payment-runs/@objectId/approve", "confirm": true,
    "successMessage": "Payment run approved",
    "visibleWhen": { "field": "state", "op": "eq", "value": "pending" } },

  { "id": "werkplek-open", "type": "toggle",
    "labelOn": "Werkplek open", "labelOff": "Werkplek gesloten",
    "stateSource": { "url": "/apps/pipelinq/api/werkplek/@objectId/state", "responsePath": "open" },
    "field": "open", "writeUrl": "/apps/pipelinq/api/werkplek/@objectId/state", "method": "PUT" }
]
```

`url` / `writeUrl` / `stateSource.url` interpolate `@objectId`,
`@object.<field>`, `@workspace.<key>`, `@config.<key>` tokens, and the
literal `{objectId}` brace form; an `api-call`'s `payload` runs the SAME
grammar recursively at any nesting depth (objects/arrays of objects —
e.g. `{ dataRefs: [{ id: '@objectId' }] }`), while the legacy `params`
only resolves one level deep. The object context comes from either
`CnDetailPage`'s `cnObjectContext` or `CnPageRenderer`'s
`cnDetailObjectContext` holder, so a detail action resolves against the
current record without extra wiring.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `actions` | `Array` | `[]` | The declarative `headerActions[]` entries. |
| `router` | `Object` | `null` | Explicit Vue Router for `navigate` / `onSuccessRoute` (falls back to `this.$router`). |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `created` | the created object | Emitted after an `open-form` action saves. `CnDetailPage` wires this to reload the record. |

## Notes

- Renders nothing when every action is hidden by `visibleWhen` — safe to
  declare on any page.
- `toggle` is intentionally **not** dispatchable through `dispatchAction`
  (it needs mounted state); dispatching one warns and no-ops.
