## ADDED Requirements

### Requirement: A host action can be offered by a field of the file's row

A host row action or side card action MAY declare `visibleIf.row`, a map of row field to the value it must have. The
action SHALL be offered on a file only when every named field of the host's row for that file equals its value
strictly. A file without a row SHALL NOT meet a `row` condition. Side card actions SHALL honour `visibleIf`
(extension, mime and row) as row actions do. An action without `visibleIf` SHALL be offered as before.

#### Scenario: The row allows the action
- **GIVEN** a side card action with `visibleIf: { row: { canChangeAccess: true } }`
- **WHEN** the selected file's row carries `canChangeAccess: true`
- **THEN** the card shows the action

#### Scenario: The row does not allow it
- **WHEN** the selected file's row carries `canChangeAccess: false`, or the string `"true"`, or no row at all
- **THEN** the card does not show the action

#### Scenario: An action without a condition
- **THEN** it is offered on every file, as before
