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
| `open-form` | Fetches the action's `schema` through the object store and mounts `CnAdvancedFormDialog`; saves the new object on confirm, toasts, bumps `cn:page:refresh`, and navigates to `onSuccessRoute` when set. Optional `props` seeds fixed field values into the create form, and `createOverride` names a registry handler that owns the persist instead of `objectStore.saveObject`. |
| `toggle` | Two-way state button: GETs `stateSource` on mount, renders `labelOn` / `labelOff`, and on click writes the flipped value **optimistically** (reverting on failure). |
| `api-call` | POST/PUT `url` + success/error toast + page refresh — via `dispatchAction`. `payload` (preferred, deep @-token resolution) or `params` (legacy, shallow) supplies the JSON body; `download: true` requests a blob response and triggers a browser file download instead (no auto-refresh unless `refresh: true`). See [dispatchAction](../utilities/dispatch-action.md#api-call-wave-3-91). |
| `agent` | Run a governed hermiq agent against the page object (hermiq#41). POSTs `{ register, schema, objectId, resultField?, skill?, prompt? }` to `/apps/hermiq/api/agents/{agent}/run-on-object` — `register` / `schema` / `objectId` default to the page's `@register` / `@schema` / `@objectId` context. A first-class companion to `api-call` (still the fallback for a bespoke body); hermiq is not hard-required — an app-level 404 toasts "Agent runtime unavailable". See [dispatchAction](../utilities/dispatch-action.md#agent-hermiq41). |
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

  { "id": "summarise", "label": "Summarise with AI", "type": "agent",
    "agent": "b2c3d4e5-…", "skill": "summarise-v1",
    "prompt": "Summarise @object.title for a busy account manager.",
    "resultField": "aiSummary", "confirm": true, "successMessage": "Summary queued",
    "visibleWhen": { "field": "state", "op": "eq", "value": "open" } },

  { "id": "werkplek-open", "type": "toggle",
    "labelOn": "Werkplek open", "labelOff": "Werkplek gesloten",
    "stateSource": { "url": "/apps/pipelinq/api/werkplek/@objectId/state", "responsePath": "open" },
    "field": "open", "writeUrl": "/apps/pipelinq/api/werkplek/@objectId/state", "method": "PUT" }
]
```

### Creating objects the bare form can't

Two optional keys on an `open-form` action cover schemas a plain create
cannot satisfy:

- **`props`** seeds fixed field values into the create form (via
  `CnAdvancedFormDialog`'s `initialValues`). This is how ONE schema backs
  several buttons — "New request" and "New complaint" both open the
  `ticket` form, each fixing its own `ticketType`. It seeds a create; it
  does not turn the dialog into an edit.

  Seed values go through the **same token grammar as filters**, so an action
  on a detail page can stamp the record it belongs to:
  `"props": { "domainObjectRef": "@objectId", "domainObjectType": "dossiq:case" }`.
  Without that resolution the literal string `@objectId` is saved, and a
  foreign key pointing at nothing is a defect that surfaces only in whatever
  reads it later.
- **`createOverride`** names a registry handler that owns the persist
  instead of `objectStore.saveObject`, resolved exactly as CnIndexPage
  resolves its `createOverride` prop (a `kind: 'create-override'` entry's
  `.handler`, a function-valued registry entry, or a function in the legacy
  `customComponents` map). Reach for it when the schema requires a field
  the form cannot supply — a server-minted foreign key, say — where a
  straight save would 400.

```jsonc
{ "id": "new-request", "label": "New request", "type": "open-form",
  "register": "pipelinq", "schema": "ticket",
  "props": { "ticketType": "request" },
  "onSuccessRoute": "TicketDetail", "variant": "primary" },

{ "id": "new-client", "label": "New client", "type": "open-form",
  "register": "pipelinq", "schema": "client",
  "createOverride": "createClientContactAware",
  "onSuccessRoute": "ClientDetail" }
```

An `agent` action's `register` / `schema` / `objectId` are omitted above —
they default to the detail page's object context. A page with no object
context must declare them explicitly.

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
