# Design: flow-task-form-component

Read on nextcloud-vue development `3eefb4f00`, openregister development
(`lib/Service/Task/TaskFormResolver.php`, `lib/Controller/TaskController.php`,
`lib/Exception/TaskFormRefusedException.php`) and buildiq development
(`openspec/changes/logic-approval-task-form`) on 7 October 2026. No canvas
board draws this dialog; it follows the layout of `CnFormDialog`, which every
task in the fleet already uses for its edit forms.

## The server answer this component reads

`GET /api/flow-tasks/{uuid}` is the inbox row merged with the resolver's
answer:

```json
{
  "uuid": "…", "title": "…", "registerId": 4, "schemaId": 12, "objectUuid": "…",
  "form": {
    "kind": "fields", "state": "broken", "error": null,
    "schema": { "id": 12, "uuid": "…", "slug": "permit", "title": "Permit" },
    "action": "approve",
    "fields": [
      { "field": "decisionNote", "required": true, "order": 0, "renderable": true, "reason": null },
      { "field": "riskScore", "required": false, "order": 1, "renderable": false, "reason": "The schema no longer has this field." }
    ]
  },
  "requireChecklist": false
}
```

`form` is `null` when the step declares none. A refused completion answers
400 with `{error, fields: [..], kind}` where `kind` is one of `undeclared`,
`missing`, `checklist`, `unresolvable`, `no-subject`.

## D1. Compose CnFormDialog, do not fork it

OpenRegister's spec forbids reimplementing field widgets: "Rendering a task
form SHALL mean scoping the existing schema-driven form component to the
declared field list." `CnTaskFormDialog` wraps `CnFormDialog` with
`includeFields`, `fieldOverrides` (`required`, `order`) and the subject
object as `item`. Broken rows are rendered by the wrapper in a slot above the
fields (the existing `#before-fields` slot, `CnFormDialog.vue:66`), since
`CnFormDialog` drops properties the schema does not have.

## D2. Who persists

`CnFormDialog` hands values back without persisting. `CnTaskFormDialog`
owns the one call it exists for: `POST .../complete`. A consumer that needs
different behaviour listens to `confirm` with `submit: false` and calls
`setResult()` itself, the library's two-phase pattern. Default `submit: true`,
because every known consumer (buildiq "My approvals", dossiq task page) wants
the same call.

## D3. Refusal handling reuses #1211's rule

The kind of each field error is decided in the dialog, as #1211 did for
lifecycle inputs, not parsed from the server's sentence: an offered and empty
field is "required", an offered and filled field is "refused for its value",
a field the dialog never offered is listed in the top message. The 400's
`kind` is used only for `checklist`, `unresolvable` and `no-subject`, which
have no field to mark: the dialog shows `error` at the top and stays open.

## D4. Broken but completable

A broken field that is not required does not block completion: the server
will accept a payload without it. A broken required field blocks Confirm,
because the server would refuse with `missing` and the performer cannot fix
it. The row says who can: "Ask the person who set up this step to fix it."

## D5. Out of scope

The checklist section (task `checklist`, `PATCH .../checklist/{itemId}`) and
the external Forms path beyond showing its unavailable state. Both are task
surfaces of their own; this change is the field form that buildiq and 5.2
ask for.

## Files

- `src/components/CnTaskFormDialog/CnTaskFormDialog.vue`, `index.js`, `CnTaskFormDialog.md`
- `src/components/index.js` (export)
- no change to `CnFormDialog`: the `#before-fields` slot exists
- `tests/components/CnTaskFormDialog.spec.js`
