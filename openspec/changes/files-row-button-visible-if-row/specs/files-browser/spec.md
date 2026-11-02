## ADDED Requirements

### Requirement: The row button follows visibleIf.row and a row field can be tested by a predicate

The files browser's `rowButton` SHALL honour `visibleIf` (extension, mime and row) and `when` as a host row action
does, reading `visibleIf.row` from the host's row for the file. A `visibleIf.row` entry whose value is an object SHALL
be read as a predicate of a form field condition (`equals`, `notEquals`, `in`, `notIn`, `truthy`, `falsy`, `empty`,
`notEmpty`) on that row field; any other value SHALL be compared strictly, as before. A file without a row SHALL NOT
meet a `row` condition. The row button SHALL NOT be drawn on a folder.

#### Scenario: A document under review shows the button
- **GIVEN** a row button with `visibleIf: { row: { reviewVerdict: { notEmpty: true } } }`
- **WHEN** a file's row carries `reviewVerdict: "open"`
- **THEN** the row shows the button

#### Scenario: The case's own draft shows no button
- **GIVEN** the same row button
- **WHEN** a file's row carries no `reviewVerdict`, or the file has no row
- **THEN** the row shows no button

#### Scenario: A plain value is still strict
- **GIVEN** a row action with `visibleIf: { row: { canChangeAccess: true } }`
- **WHEN** the row carries the string `"true"`
- **THEN** the action is not offered
