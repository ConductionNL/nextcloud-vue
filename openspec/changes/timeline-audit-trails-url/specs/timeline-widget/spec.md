# Timeline widget: audit trail route and lists

## ADDED Requirements

### Requirement: The audit trail source reads OpenRegister's route

With `auditTrail: true`, the widget MUST request `/api/objects/{register}/{schema}/{id}/audit-trails`.

#### Scenario: The audit trail loads

- GIVEN a timeline widget with `auditTrail: true` on an object
- WHEN it loads
- THEN it requests `…/audit-trails`
- AND the changes appear as events, not as a failed source

### Requirement: A list on the object becomes dated events

A `lists` entry `{ field, dateField, labelField?, label?, detailField? }` MUST turn every entry of the list at `field` that has a date at `dateField` into one event, labelled by its `labelField` value (else `label`), with `detailField` as the line under it. Entries without a date add nothing.

#### Scenario: A status history shows with its reasons

- GIVEN an object whose `statusHistory` holds two dated entries and one without a date
- WHEN the widget lists `statusHistory`
- THEN two events appear, labelled by status, each with its reason
