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
| `open-form` | Fetches the action's `schema` through the object store and mounts `CnFormDialog`; saves the new object on confirm, toasts, bumps `cn:page:refresh`, and navigates to `onSuccessRoute` when set. Optional `props` seeds fixed field values, `includeFields` / `excludeFields` / `fieldOverrides` narrow what the button asks for, `createOverride` names a registry handler that owns the persist, and `advanced: true` swaps in the properties/JSON table. |
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

**`appInstalled`** is a precondition rather than a mode: it names the Nextcloud
app that backs the action, and it is checked before anything else. On its own it
is the whole condition (`{ "appInstalled": "humaniq" }`); combined with a
`field` / `endpoint` / `source` it gates that mode as well, so both must hold.

It exists because the manifest menu's `visibleIf` already spoke this word and
`visibleWhen` did not. An author who wrote `{ "appInstalled": "humaniq" }` here
got a condition with no `field`, which the predicate rejects as malformed and
hides — so the button never appeared and nothing said why. An action that writes
into a sibling app should carry it, so an install without that app sees no
button rather than a form that saves nowhere.

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

### Which dialog opens

`open-form` mounts the plain `CnFormDialog`. A header button that says New
case is aimed at someone filing one, not at someone inspecting the schema,
and `CnIndexPage` already defaults the same way. Set `advanced: true` on the
action for the properties and JSON table instead.

### Narrowing what the button asks for

One schema backs two surfaces. The detail page edits all of it; the header
button collects what someone filing a new one types. `includeFields`,
`excludeFields` and `fieldOverrides` are forwarded straight to the dialog, so
the narrowing lives beside the button rather than forcing the schema to
choose which surface it serves.

```jsonc
{ "id": "new-case", "label": "New case", "type": "open-form",
  "register": "dossiq", "schema": "case",
  "includeFields": ["caseType", "title", "description", "assignee",
                    "priority", "startDate"],
  "onSuccessRoute": "CaseDetail" }
```

A schema property may also declare `x-openregister-extends-form`, in which
case picking its value adds that value's own fields to the form and the
answers are written to the declared value schema after the object is saved.
See [fields the data decides](../utilities/dynamic-form-fields.md).

### Creating objects the bare form can't

Two optional keys on an `open-form` action cover schemas a plain create
cannot satisfy:

- **`props`** seeds fixed field values into the create form (via
  the dialog's `initialData`). This is how ONE schema backs
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
| `inline` | `Number` | `0` | How many collapsible actions stay as buttons; the rest fall into one `···` menu. `0` renders every action as a button (the pre-existing behaviour). |
| `overflowLabel` | `String` | `''` | Name for the overflow menu. Empty falls back to a translated "Actions". |
| `router` | `Object` | `null` | Explicit Vue Router for `navigate` / `onSuccessRoute` (falls back to `this.$router`). |

## Overflow and sub-actions

`inline` caps how many actions stay visible as buttons. It defaults to `0`,
meaning no cap — so a consumer that never sets it keeps every action as a
button and no `···` menu is rendered at all.

Three shapes are never collapsed, and never consume one of the N slots:

| Shape | Why |
|-------|-----|
| `variant: "primary"` | `NcActions` paints all of its inline actions with one shared `variant`, so a single primary among them cannot be expressed. |
| carries `children` | `NcActions` cannot nest another `NcActions`. |
| `type: "toggle"` | Its state lives in its own button. |

An action with `children[]` renders its own chevron dropdown beside its
button — deliberately not folded into the page's one overflow menu, since a
list that grows per record (app versions, say) would swamp it. Children take
the same descriptor shape, including `visibleWhen`, and `childrenLabel` names
the dropdown when the parent's own label is not what you want announced.

```json
{ "id": "open-app", "label": "Open app", "variant": "primary",
  "type": "open-page", "target": "/apps/petstore",
  "childrenLabel": "Open a version",
  "children": [
    { "id": "v-1-2", "label": "Open v1.2", "type": "open-page", "target": "/apps/petstore?v=1.2" }
  ] }
```

A parent component composing entries in JS may set `onSelect` to a function
instead of a dispatch `type`; it runs after the confirm gate like any
dispatched action. Manifest JSON cannot carry a function, so the declarative
path is unaffected — `CnDetailPage` uses it to fold its own Edit button in.

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `created` | the created object | Emitted after an `open-form` action saves. `CnDetailPage` wires this to reload the record. |

## Notes

- Renders nothing when every action is hidden by `visibleWhen` — safe to
  declare on any page.
- `toggle` is intentionally **not** dispatchable through `dispatchAction`
  (it needs mounted state); dispatching one warns and no-ops.
