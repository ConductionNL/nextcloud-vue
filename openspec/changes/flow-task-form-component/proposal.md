---
kind: code
---

# Proposal: flow-task-form-component

## Summary

A dialog that shows a person the form an OpenRegister task asks them to
fill in, and completes the task with what they typed. It reads the form
OpenRegister resolves for the task, renders the declared fields through the
existing schema-driven form, shows a field the schema no longer offers as a
disabled row that says why, and stays open with the typed values when the
server refuses the completion and names fields.

## Why

OpenRegister's archived change `2026-10-05-flow-task-forms` built the server
half: `GET /api/flow-tasks/{uuid}` returns the task with a resolved `form`
(state `ready`, `broken` or `unresolvable`, each declared field with
`required`, `order`, `renderable` and `reason`), and
`POST /api/flow-tasks/{uuid}/complete` validates `data` against the declared
fields. Its tasks.md item 5.2 is half done: the refusal half shipped in
nextcloud-vue#1211 (`CnLifecycleActions` input dialog), and the broken-field
half is open because "no task-completion surface consuming
`TaskFormResolver`'s render/broken-with-reason answer exists in the library
yet. It is a component, not a repair."

buildiq's change `logic-approval-task-form` (on buildiq development) needs
exactly that component: its task T04 opens "the nextcloud-vue task form
component" from "My approvals" and is blocked on it.

## What changes

- New component `CnTaskFormDialog`. Given a task uuid (or a task answer
  already fetched), it reads `GET /apps/openregister/api/flow-tasks/{uuid}`,
  loads the subject schema and object, and renders the `form`.
- `kind: "fields"`, state `ready`: `CnFormDialog` scoped with
  `includeFields` to the renderable fields, with `fieldOverrides` carrying
  `required` and `order` from the declaration.
- State `broken`: the same, plus one disabled row per non-renderable field
  showing its label (or key) and the server's `reason`. Confirm stays
  enabled only when no broken field is required.
- State `unresolvable`, or `kind: "external"` with state `unavailable`: the
  dialog shows the server's `error` and no form; Confirm is disabled.
- Confirm posts `{outcome, comment, data}` to `.../complete`. On 200 the
  dialog emits `completed` with the task row and closes. On a 400 with
  `fields` it stays open with every typed value intact and marks each named
  field; a field the dialog did not offer is named in the message instead.

## Rows unblocked

- buildiq `logic-human-task-form` (T04 of `logic-approval-task-form`).
- OpenRegister `flow-task-forms` task 5.2, first half.
- dossiq `3.4` (user tasks with a form) gets the broken-field rendering it
  lacks today.

## Affected projects

- `nextcloud-vue`: new `CnTaskFormDialog`; no change to `CnFormDialog`'s
  public API.
- Consumers: buildiq first, then dossiq, pipelinq and any app with a task
  inbox.

## Backward compatibility

Additive: a new component. No existing component changes behaviour.

## Theming

`NcDialog`, `NcNoteCard` and the existing `CnFormDialog` styles. Nextcloud
CSS variables only.
