# cn-workspace-context-widgets Delta: object-list-create-with-initial-data

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [object-list-create-with-initial-data](../../)

## Purpose

"+ Add" on an object-list widget creates the child in the parent's context.
Findings A03, A17 and A27 and defect triage #6 of the dossiq round 2
analysis.

## ADDED Requirements

### Requirement: CnObjectListWidget opens its create form in context

`openCreate` SHALL mount `CnFormDialog` with the widget's `register` and with
`initialData` derived from the resolved filter: each filter key that is a
property of the schema, with `@objectId`, `@me` and `@workspace.*` resolved.
Operator keys and keys absent from the schema SHALL be dropped. A `$ref`
property SHALL render as a picker.

#### Scenario: Task created on the case

- **GIVEN** an object-list over `caseTask` with `filter: { case: "@objectId" }` on case `c1`, where `case` is required
- **WHEN** the user clicks "+ Add"
- **THEN** the form opens with `case` set to `c1`, the Create button is enabled once `title` is filled, and the saved task carries `case: c1`

#### Scenario: Operator keys are not initial data

- **GIVEN** `filter: { case: "@objectId", "deadline[lt]": "@today" }`
- **WHEN** the form opens
- **THEN** `initialData` is `{ case: "c1" }`

#### Scenario: Reference renders as a picker

- **GIVEN** a schema whose `case` is `$ref` to `case` and a widget declaring `register`
- **WHEN** the form opens
- **THEN** the `case` field is a reference picker showing the case title, not a text box

@e2e include On a case detail, click "+ Add" on the tasks object-list; assert the case field is prefilled and read as a label; fill a title; save; assert the new row lists under the case.

### Requirement: A prefilled parent stays put

With `content.lockFilterFields` (default `true`), a reference field prefilled
from the filter SHALL render read-only with its resolved label.
`content.createDefaults` SHALL merge over the filter-derived initial data.

#### Scenario: Locked parent

- **GIVEN** the default `lockFilterFields`
- **WHEN** the form opens from a case-scoped list
- **THEN** the `case` field is read-only and shows the case title

#### Scenario: Defaults merge

- **GIVEN** `createDefaults: { direction: "outbound" }` on a contact moment list
- **WHEN** the form opens
- **THEN** `direction` is preselected as outbound and `case` is still prefilled

@e2e include Open the create form from a scoped list with `createDefaults`; assert the locked parent and the default value.
