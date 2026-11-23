# badge-cell-empty-label

## ADDED Requirements

### Requirement: A badge cell can name an empty value

A `badge` cell with `widgetProps.emptyLabel` SHALL render an empty value as a default pill with that label, translated by the host. Without `emptyLabel`, or with a value, it SHALL render as before.

#### Scenario: A message without a proposal

- **GIVEN** a Voorstel column with `widget: "badge"` and `widgetProps.emptyLabel: "No case"`
- **WHEN** a row has no proposal
- **THEN** the cell shows a grey pill reading "No case" in the reader's language
