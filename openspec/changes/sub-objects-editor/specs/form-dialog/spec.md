# form-dialog Delta: sub-objects-editor

**Status**: in-progress
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: Rows are tidied before they are saved

A sub-objects field with `pruneWhen` SHALL save its rows trimmed, without empty optional keys, and without the rows whose `blank` keys are empty (and, with `invalid: true`, without rows missing a required key). A row the save drops SHALL NOT block the save.

#### Scenario: A blank checklist item

- **GIVEN** a status with checklist rows " Call " and ""
- **WHEN** the form is saved with `pruneWhen: { blank: ['title'] }`
- **THEN** the checklist saved is `[{ title: 'Call' }]`

### Requirement: An optional object has a switch

A field with `widget: 'object-switch'` SHALL render a switch. Turning it on SHALL fill the object with `defaults` and its dotted fields with the matching values. Turning it off SHALL write `null`, and the save SHALL keep it `null` whatever its dotted fields hold.

#### Scenario: Only in some cases

- **GIVEN** a field rule without a condition
- **WHEN** the reader turns on "Only in some cases" and picks "Field equals" with value "yes"
- **THEN** the rule saves `condition: { kind: 'fieldEquals', value: 'yes' }`
- **AND** turning it off again saves `condition: null`
