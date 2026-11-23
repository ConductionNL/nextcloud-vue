# workspace-filter Delta: screens-workspace-filter-translate

## ADDED Requirements

### Requirement: Every workspace filter style translates its texts

`CnWorkspaceFilterWidget` SHALL pass the label and every option label of its
`select` and radio styles, and their accessible names, through the injected
`cnTranslate`, as the chips and the switch do. The value an option writes SHALL
stay the declared value.

#### Scenario: A sort select in a bar

- **GIVEN** a bar whose sort select has the label "Sort" and the options "Deadline" and "Priority", and an app catalogue that answers "Sorteren", "Termijn" and "Prioriteit"
- **WHEN** the bar renders
- **THEN** the select reads "Sorteren" with the options "Termijn" and "Prioriteit", and choosing "Termijn" writes `deadline`
- @e2e e2e/workspace-filter-translate.e2e.js
