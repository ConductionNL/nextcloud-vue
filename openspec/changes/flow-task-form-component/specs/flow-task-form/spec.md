# flow-task-form Specification

## Purpose

A person assigned an OpenRegister task with a form fills it in and completes
the task in one dialog. The form contract is OpenRegister's
`flow-task-forms`; this capability is the library component that renders it.

## ADDED Requirements

### Requirement: CnTaskFormDialog renders the form OpenRegister resolved for the task

`CnTaskFormDialog` SHALL accept a `taskUuid` prop or a `task` prop (an
answer of `GET /api/flow-tasks/{uuid}` already fetched). Given only
`taskUuid` it SHALL fetch the task. For `form.kind` `fields` it SHALL load
the subject schema (`form.schema.id`) and the subject object
(`registerId`, `schemaId`, `objectUuid`) and SHALL render `CnFormDialog`
scoped to the renderable declared fields, in the declared `order`, each
marked required exactly when the declaration says `required: true`,
regardless of the schema's own required list. When `form` is `null` the
dialog SHALL show a comment field only.

#### Scenario: A ready form in declared order

- **GIVEN** a task whose form is `ready` and declares `decisionNote` (required, order 0) and `startDate` (optional, order 1), and a schema that lists neither as required
- **WHEN** the dialog opens
- **THEN** it SHALL render `decisionNote` then `startDate`
- **AND** `decisionNote` SHALL be marked required and `startDate` SHALL NOT

#### Scenario: A task without a form

- **GIVEN** a task whose `form` is `null`
- **WHEN** the dialog opens
- **THEN** it SHALL render a comment field and no schema fields

#### Scenario: Only the declared fields render

- **GIVEN** a subject schema with ten properties and a form declaring two
- **WHEN** the dialog opens
- **THEN** exactly the two declared fields SHALL render

@e2e include Open a task with a ready two-field form in the dialog; assert the two fields, their order and the required mark; fill them; confirm; assert the POST to `/complete` carries `data` with both values.

### Requirement: A field the schema no longer offers is shown as a disabled row

For every declared field with `renderable: false`, the dialog SHALL render a
disabled row naming the field and showing the server's `reason`, above the
rendered fields in declared order. It SHALL NOT omit the field. When any such field
is `required`, the Confirm button SHALL be disabled and the row SHALL say
that the person who set up the step has to fix it. When none is required,
Confirm SHALL stay enabled.

#### Scenario: A dropped optional field

- **GIVEN** a task whose form is `broken` because the optional field `riskScore` has `renderable: false` and reason "The schema no longer has this field."
- **WHEN** the dialog opens
- **THEN** a disabled row for `riskScore` SHALL show that reason
- **AND** Confirm SHALL be enabled

#### Scenario: A dropped required field blocks completion

- **GIVEN** a broken form whose required field `decisionNote` is not renderable
- **WHEN** the dialog opens
- **THEN** the row for `decisionNote` SHALL say the step's author has to fix it
- **AND** Confirm SHALL be disabled

#### Scenario: An unresolvable form shows the error and no fields

- **GIVEN** a task whose form state is `unresolvable` with error naming the flow and the version
- **WHEN** the dialog opens
- **THEN** the dialog SHALL show that error, render no fields, and keep Confirm disabled

#### Scenario: An external form that is unavailable

- **GIVEN** a task whose form is `kind: "external"` with state `unavailable` and an error
- **WHEN** the dialog opens
- **THEN** the dialog SHALL show the error and keep Confirm disabled

@e2e include Open a task whose schema dropped a declared optional field; assert the disabled row and its reason; complete the task.

### Requirement: Confirm completes the task, and a refusal keeps the dialog open

With `submit` true (the default), Confirm SHALL send
`POST /apps/openregister/api/flow-tasks/{uuid}/complete` with `outcome`
(prop, default `done`), the comment when given, and `data` holding the
values of the rendered fields. On success the dialog SHALL emit `completed`
with the response and close. On a 400 carrying `fields`, the dialog SHALL
stay open with every typed value intact, SHALL mark each named field it
rendered (empty means required, filled means refused for its value), and
SHALL list in its top message any named field it did not render. On a 400
without `fields`, or with `kind` `checklist`, `unresolvable` or
`no-subject`, it SHALL show `error` at the top and stay open. With `submit`
false, Confirm SHALL emit `confirm` with `{outcome, comment, data}` and the
parent SHALL report back through `setResult()`.

#### Scenario: A missing required value is marked on its row

- **GIVEN** a form with required `decisionNote` and optional `startDate`, the user filled only `startDate`
- **WHEN** the server answers 400 `{"error": "…", "fields": ["decisionNote"], "kind": "missing"}`
- **THEN** the dialog SHALL stay open, `startDate` SHALL keep its value, and `decisionNote` SHALL be marked as required

#### Scenario: A field the dialog never offered

- **GIVEN** the server answers 400 with `fields: ["legacyFlag"]` and `kind: "undeclared"`
- **WHEN** the response arrives
- **THEN** the top message SHALL name `legacyFlag` as a field this step does not accept

#### Scenario: Completed

- **GIVEN** a valid form
- **WHEN** the user confirms with outcome `approved` passed as prop and the server answers 200
- **THEN** the dialog SHALL emit `completed` with the task row and close

#### Scenario: The parent persists

- **GIVEN** the dialog with `submit: false`
- **WHEN** the user confirms
- **THEN** no request SHALL be sent and `confirm` SHALL be emitted with `{outcome, comment, data}`

### Requirement: A step whose form drifted is flagged in the flow editor

`CnFlowDetail` SHALL check every user-task step that declares a native form
(`config.form.fields`) against the flow's subject schema, when the flow's
trigger names one, and SHALL flag a step when a declared field is absent
from that schema, marked `readOnly`, or marked not visible. A flagged step
SHALL carry a warning mark on its node card and SHALL add a standing message
to `CnFlowCanvasMessages` naming the step and each field with its reason.
The message SHALL disappear when the step or the schema no longer drifts. A
flow whose trigger names no schema SHALL show no flag; the server's
save-time validation stays the authority.

#### Scenario: A field dropped from the schema after the step was saved

- **GIVEN** a flow triggered on schema `permit` with a user-task step declaring `riskScore`, and `permit` no longer has `riskScore`
- **WHEN** the author opens the flow
- **THEN** the step's node SHALL carry a warning mark
- **AND** the canvas messages SHALL name the step and say `riskScore` is no longer in the schema

#### Scenario: Fixing the step clears the flag

- **GIVEN** the flagged step above
- **WHEN** the author removes `riskScore` from the step's form
- **THEN** the warning mark and the message SHALL disappear

#### Scenario: No subject schema, no guess

- **GIVEN** a flow whose trigger names no schema
- **WHEN** the author opens it
- **THEN** no step SHALL be flagged for its form
