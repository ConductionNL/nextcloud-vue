# CnLifecycleActions

Declarative, status-gated lifecycle/transition buttons for a `type:"detail"` page.

Reads the OpenRegister lifecycle (`x-openregister-lifecycle`) for the page's
object and renders one button per transition that is **allowed from the object's
current status**. Clicking a button POSTs to OpenRegister's transition endpoint,
then asks the host to reload the object. OpenRegister's listener re-validates the
transition server-side, so a rejection (403 / 422) is surfaced inline — the
button never lies about what the server will accept.

`CnDetailPage` mounts this automatically when the manifest page config declares
`lifecycleActions`; you rarely instantiate it directly.

## How the transitions are obtained

Two modes, picked automatically:

- **Server-derived (default).** When the config is just `{ field: 'status' }`,
  the component GETs
  `/apps/openregister/api/objects/{id}/available-actions`, which returns
  `{ actions: [{ action, to, requires, description }] }` already filtered to the
  object's current state. This is the source of truth and stays correct as the
  schema's lifecycle graph evolves — no client-side state machine to keep in
  sync.
- **Config-declared.** When an explicit `transitions: [{ from, to, action,
  label, confirm?, variant? }]` array is given, the component filters it by the
  object's current `status` value itself (no extra request). Use this for static
  labelling / confirm prompts. Set `autoFetch: true` to force the server path
  even with a `transitions` array present.

**Button text.** A button reads its explicit `label` (config-declared, or a
`label` on the server's action entry), else the action name title-cased
(`approve` → "Approve"), else the target state. A transition's `description`
is never the button text: schemas write it as a sentence for the person
deciding, so it goes on the button's tooltip (`title`) and accessible
description (`aria-description`) instead.

On a successful transition the component POSTs
`/apps/openregister/api/objects/{id}/transition` with `{ action }`, emits
`transitioned` + `reload`, and (in server mode) re-fetches the action list.

## Transition inputs

A transition may declare `inputs: [{ field, required }]` — mirroring the
schema's `x-openregister-lifecycle.transitions.<action>.inputs` — on **either
path**: the server's `/available-actions` entries or the config-declared
`transitions` array. Clicking such a transition first opens
[`CnTransitionInputDialog`](./cn-transition-input-dialog.md) to collect the
declared fields, then POSTs `{ action, data: { <field>: <value> } }`.
Cancelling the dialog POSTs nothing. The endpoint accepts only the declared
keys and enforces `required: true` server-side (400 otherwise); the dialog
enforces the same requirement client-side by disabling its confirm button.

A transition **without** `inputs` POSTs `{ action }` immediately — no dialog,
no `data` key — exactly as before.

Pass the object's JSON Schema via the `schema` prop so each input renders with
the property's `title` and an appropriate widget (checkbox for boolean, number
field, textarea for long text). `CnDetailPage` forwards its fetched schema
automatically; without one, every input falls back to a plain labelled text
field named after the raw field key.

## Manifest config (consumed by CnDetailPage)

```jsonc
// Minimal — server decides which transitions are allowed:
"config": {
  "register": "pipelinq", "schema": "cashShift",
  "lifecycleActions": { "field": "status" }
}
```

```jsonc
// Explicit — static labels + confirm prompts, filtered client-side by status:
"config": {
  "lifecycleActions": {
    "field": "status",
    "transitions": [
      { "from": "open", "to": "closed", "action": "close", "label": "Close shift", "confirm": "Close this shift?" },
      { "from": "closed", "to": "reconciled", "action": "reconcile", "label": "Reconcile", "variant": "primary" }
    ]
  }
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `objectId` | `String \| Number` | `''` | Object id/uuid/slug the transitions apply to. |
| `object` | `Object \| null` | `null` | The loaded object — read for the lifecycle field value and to filter a config-declared `transitions` list. |
| `config` | `Object` | `{}` | The lifecycle config block: `{ field?, transitions?, autoFetch? }`. A declared transition may carry `inputs: [{ field, required }]`. |
| `schema` | `Object \| null` | `null` | The object's JSON Schema (with `properties`), forwarded to `CnTransitionInputDialog` so declared inputs render resolved fields. |
| `display` | `'buttons' \| 'menu'` | `'buttons'` | Where the transitions are drawn. `menu` renders no buttons and emits `entries`, so the host lists them in its Actions menu. `CnDetailPage` uses `menu`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `transitioned` | `{ action, to, object }` | A transition succeeded. |
| `reload` | — | Ask the host to re-fetch the object so the new state + freshly-allowed transitions render. |
| `entries` | `Array<{ id, label, iconName, disabled, testid, run }>` | `display: 'menu'` only. The transitions as menu-ready entries, re-emitted whenever they or the pending state change. |

## Notes

- Renders nothing (no DOM) when no transition is allowed from the current
  state — safe to leave declared on every detail page.
- A `confirm` string on a config-declared transition prompts via `window.confirm`
  before POSTing.

## Input hints

`config.inputs` (on the page's `lifecycleActions`) is a map of action name to a list of `{ field, picker?, fields? }`. Each entry is merged onto the transition's declared input with the same `field`, so a server-declared transition (from `/available-actions`) gets a record picker (`picker`) or a narrowed object input (`fields`) without the server knowing about the screen. A hint for a field the transition does not declare is ignored with one console warning and never adds an input. A config-declared transition can carry `picker` and `fields` on its own input entry. The `register` prop is handed to the dialog for its reference pickers (`CnDetailPage` passes its own).

```json
{ "lifecycleActions": { "field": "status", "inputs": { "recordMunicipalityFeedback": [{ "field": "municipalityFeedback", "fields": ["masRoute", "note"] }] } } }
```

## Confirm, toast and undo

- **Confirm.** A transition with `variant: "danger"`, a move into a final state (`final: true` on the transition, or the target listed in `config.finalStates`), or `confirm` set (the string is the question) opens a confirm dialog first; Cancel sends no request. `confirm: false` skips it. The old browser `window.confirm` is gone.
- **Toast.** After a successful move a toast reads "Moved {title} to {state}" (the schema title when the object has no name). A refusal also toasts its message beside the inline error. `feedback: false` on the config suppresses the toasts only.
- **Undo.** When the graph declares a transition from the new state back to the old one, the toast carries an Undo for ten seconds that posts it (from the config `transitions[]`, or from the server's available actions). Without a declared reverse edge the toast has no button; the library never guesses a way back.
