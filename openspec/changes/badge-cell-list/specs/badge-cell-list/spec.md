# badge-cell-list Delta

## ADDED Requirements

### Requirement: A badge cell draws one chip per entry of a list

A `badge` cell whose value is a list SHALL draw one chip per non-empty entry, wrapping, in `widgetProps.variant`
(default `default`), and the dash for an empty list. A single value SHALL draw one badge as before.

#### Scenario: Board PqBiExport

- **GIVEN** a job with `sourceSchemas: ["ticket", "client"]` in a `badge` column
- **THEN** the cell shows the chips "ticket" and "client"
