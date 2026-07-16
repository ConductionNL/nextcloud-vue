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

On a successful transition the component POSTs
`/apps/openregister/api/objects/{id}/transition` with `{ action }`, emits
`transitioned` + `reload`, and (in server mode) re-fetches the action list.

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
| `config` | `Object` | `{}` | The lifecycle config block: `{ field?, transitions?, autoFetch? }`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `transitioned` | `{ action, to, object }` | A transition succeeded. |
| `reload` | — | Ask the host to re-fetch the object so the new state + freshly-allowed transitions render. |

## Notes

- Renders nothing (no DOM) when no transition is allowed from the current
  state — safe to leave declared on every detail page.
- A `confirm` string on a config-declared transition prompts via `window.confirm`
  before POSTing.
