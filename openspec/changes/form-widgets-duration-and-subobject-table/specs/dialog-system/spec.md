# dialog-system Delta: form-widgets-duration-and-subobject-table

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [form-widgets-duration-and-subobject-table](../../)

## Purpose

`CnFormDialog` edits an ISO duration as a number and a unit, and an array of
objects as a table. Findings A10, A11 and A20 and defect triage #7 of the
dossiq round 2 analysis.

## ADDED Requirements

### Requirement: REQ-DG-020 Duration widget

`CnFormDialog` and `CnFormPage` SHALL select a `duration` widget for a
property with `type: string` and `format: duration`, and SHALL accept it by
name in a field override. The widget SHALL render a number input and a unit
select, each with `inputLabel`, SHALL read the largest whole unit from the
stored ISO 8601 value and SHALL write the canonical string for the chosen
unit. A value that does not reduce to one unit SHALL render as read-only ISO
text with an edit toggle. An empty input SHALL write `null`.

#### Scenario: Days in, days out

- **GIVEN** a property `handlingTerm` with `format: duration` and stored value `P56D`
- **WHEN** the form opens
- **THEN** the widget shows 56 and days, and changing it to 8 weeks saves `P8W`

#### Scenario: Mixed value is not rounded

- **GIVEN** a stored value `P1DT2H`
- **WHEN** the form opens
- **THEN** the widget shows the ISO text read-only with an edit toggle and saves it unchanged when untouched

#### Scenario: Cleared writes null

- **GIVEN** a stored value `PT4H`
- **WHEN** the user clears the number and saves
- **THEN** the payload carries `null` for the property

@e2e include Open the case type form with a duration field; change 56 days to 8 weeks; save; assert the payload `P8W`.

### Requirement: REQ-DG-021 Sub-objects widget

`CnFormDialog` and `CnFormPage` SHALL provide a `sub-objects` widget for a
property of `type: array` whose `items` is an object schema, selected by
`x-widget: sub-objects` on the property or by a field override; the default
for such a property SHALL stay `json`. The widget SHALL render the rows as a
table with one column per item property up to `maxColumns`, and SHALL offer
Add, Edit, Duplicate, Move up, Move down and Remove. Edit SHALL open a nested
`CnFormDialog` over `items`. Per-row `items.required` SHALL be validated
before Save, naming the row. Reorder SHALL rewrite an `order` property when
`items.properties` declares one.

#### Scenario: Statuses as rows

- **GIVEN** a property `statuses` with `x-widget: sub-objects` and items `{ name, key, color, order }` with `required: [name, key]`
- **WHEN** the form opens with three stored rows
- **THEN** a table shows three rows with name, key, color and order columns and an Add row button

#### Scenario: Missing required value names the row

- **GIVEN** the second row without a `key`
- **WHEN** the user clicks Save
- **THEN** Save is blocked and the message names row 2 and the field key

#### Scenario: Move down rewrites order

- **GIVEN** rows with `order` 1, 2, 3
- **WHEN** the user moves the first row down
- **THEN** the payload carries the rows in the new sequence with `order` 1, 2, 3 reassigned

#### Scenario: Default stays json

- **GIVEN** an array-of-objects property without `x-widget` and without an override
- **WHEN** the form opens
- **THEN** the `json` widget renders as before

@e2e include Open a form with a sub-objects field; add a row through the nested dialog; move it up; save; assert the array order and the `order` values in the payload.
