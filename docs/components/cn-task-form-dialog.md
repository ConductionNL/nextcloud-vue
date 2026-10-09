import GeneratedRef from './_generated/CnTaskFormDialog.md'

# CnTaskFormDialog

A dialog that shows the form an OpenRegister task asks a person to fill in and completes the task with what they typed. It reads `GET /api/flow-tasks/{uuid}` (or takes the answer as `task`), loads the subject schema and object, and scopes [`CnFormDialog`](./cn-form-dialog.md) to the declared, renderable fields in the declared order, each required exactly when the declaration says so.

```vue
<CnTaskFormDialog taskUuid="…" outcome="approved" @completed="reload" @close="open = false" />
```

## States

- `form: null`: a comment field only.
- `ready`: the declared fields.
- `broken`: the same, plus one disabled row per field the schema no longer offers, with the server's reason. Confirm stays enabled unless a broken field is required (the row then says the person who set up the step has to fix it).
- `unresolvable`, or an `external` form that is `unavailable`: the server's error and no form; Confirm is disabled.

## Completing

With `submit` (the default) Confirm posts `{ outcome, comment, data }` to `/api/flow-tasks/{uuid}/complete` and emits `completed`. A 400 keeps the dialog open with every typed value: an empty named field is marked required, a filled one refused, and a field the dialog did not offer is named in the top message. A `checklist`, `unresolvable` or `no-subject` refusal shows only the error. With `submit` false it emits `confirm` with `{ outcome, comment, data }` and the parent reports back through `setResult()`.

The flow editor (`CnFlowDetail`) flags a user-task step whose declared form names a field the trigger's schema dropped, made read-only or hid.

## Props

`taskUuid`, `task`, `outcome` (default `done`), `submit` (default `true`), `dialogTitle` (`dialog-title`, defaults to the task title) and `apiBase` (`api-base`, default `/apps/openregister/api`).

<GeneratedRef />
