## ADDED Requirements

### Requirement: A data card can keep its declared columns in the board look

With `fixedColumns: true` the data widget SHALL lay its fields out in exactly `columns` columns under the board look;
without it the board look SHALL keep fitting 200px columns.

#### Scenario: Two columns row by row

- **GIVEN** a data card with `columns: 2` and `fixedColumns: true`
- **WHEN** it renders in the board look
- **THEN** its grid SHALL be `repeat(2, minmax(0, 1fr))`
