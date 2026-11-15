## ADDED Requirements

### Requirement: The recap can say why and open a step again

The summary recap SHALL show a step's `summaryHint` under its row. A summary step with `summaryEditable: true` SHALL give
each recap row of a step a Change button that opens that step without validating the current one.

#### Scenario: changing the language from the recap
- **GIVEN** a summary step with `summaryEditable: true` after a `language` step
- **WHEN** the reader presses Change on the Language row
- **THEN** the wizard shows the Language step and emits `step-change` with its index

### Requirement: A config-fields step can hold a repeatable group

A `config-fields` property of type array of objects with `repeatable: true` SHALL be drawn as rows of the items'
sub-fields with add and remove buttons, and SHALL be saved as one list without the rows left empty. A step with
`action` SHALL post its values to `/api/setup/action/{action}`, and SHALL stay open with the answer's message when the
answer says `success: false`.

#### Scenario: two administrations
- **WHEN** the reader fills two rows and presses Next
- **THEN** the step posts `{ administrations: [row1, row2] }` to its action
