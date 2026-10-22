# column-value-labels

## ADDED Requirements

### Requirement: A column can name empty values, code words and list membership

A table column MAY declare `contains`, `valueLabels` and `emptyLabel`.
- With `contains`, the shown value SHALL be true when the row's value is a list holding it, and false otherwise.
- With `valueLabels`, a value found in the map SHALL show as its word.
- With `emptyLabel`, an empty value SHALL show as that word.

Words SHALL pass through the app's translation. Sorting and filtering SHALL keep using the stored value.

#### Scenario: A mandate table
- **GIVEN** a column on `terms.plafond` with `emptyLabel: "Unlimited"` and the currency format
- **AND** a column on `terms.decisionTypes` with `contains: "bezwaar"` and `valueLabels: {"true": "Yes", "false": "No"}`
- **WHEN** a role has no ceiling and may decide objections
- **THEN** its row SHALL read "Unlimited" and "Yes"
