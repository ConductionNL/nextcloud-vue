# Design: object-actions-ui

## The manifest shape

```json
{ "id": "publish", "type": "object-action", "action": "publish" }
{ "id": "case-actions", "actionsFrom": "openregister", "include": ["claim", "hold"] }
```

- `object-action` names one action key. `label` and `icon` are optional and default to what OpenRegister lists. The
  target is the page's object (`@register`, `@schema`, `@objectId`), or `register`, `schema` and `objectId` on the action.
- `actionsFrom: "openregister"` expands in place into one `object-action` per listed action of the host's surface:
  `header` for a page's header actions, `row` for row actions, `bulk` for bulk actions. `surface` overrides it.
  `include` keeps those keys in that order.

An entry whose action is not listed renders nothing: OpenRegister left it out because the person may not run it. An
entry whose action is listed with `available: false` renders disabled, with the reason as its title and its
description.

## Running

1. Confirm text with no inputs: a confirm dialog. Inputs: `CnObjectActionDialog`, which shows the confirm text above the
   inputs.
2. `runObjectAction` posts `{ inputs }`. Empty optional values are not sent, so the declared default applies on the
   server.
3. 200: toast, `cn:page:refresh`, then `next`. 202 `queued`: the dialog (or a toast) shows that it is running and
   follows `/api/flow-runs/{uuid}`. 202 `suspended`: says the run waits. 409: the reason. 422: the refused inputs are
   marked in the dialog, which stays open with what was typed.
4. `next: "next"` and `next: "list"` are emitted as `cn:object-action:next` for the detail page, which owns the list
   context.

## Inputs from JSON Schema

`objectActionInputs()` turns `{ type: object, required, properties }` into the declared-input list
`CnTransitionInputFields` reads, with the input schema itself as its schema. `enum` (with `x-enumLabels` or `oneOf`
titles) becomes a picker, `format: date` a date field, `writeOnly` a password field. Defaults `@now`, `@user` and
`@object.<path>` are shown resolved; an untouched default is sent as typed.

## Macros

`CnMacrosWidget` reads `useObjectActions` and keeps `kind: flow|steps`. `macrosFrom` narrows the list as before. On an
OpenRegister that answers 404 for the actions route, it reads the schema's `x-openregister-action` as it did, so a
release of the library does not wait for the server.
