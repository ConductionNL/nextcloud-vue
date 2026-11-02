# board-record-list-checklist-rows Delta: record-list

## ADDED Requirements

### Requirement: A board checklist row is drawn as the board

Under the board look, a record-list checklist row SHALL be at least 20px high
with 10px between the mark and a 15px label; a done mark SHALL take the board's
success tint and ink with a 12px tick; the progress bar SHALL sit 12px above the
rows. Rows stay 8px apart.

#### Scenario: Seven steps in three columns

- **GIVEN** a board record list with `presentation: "checklist"`, `progress: true` and seven rows
- **WHEN** it renders in three columns
- **THEN** the rows are 28px apart, as DqTenant "Inrichten" draws them
