# board-record-list-checklist-rows Delta: record-list

## ADDED Requirements

### Requirement: A board checklist row is drawn as the board

Under the board look, a record-list checklist row SHALL be at least 20px high
with 10px between the mark and a 15px label at the font's normal line height; a
done mark SHALL take the board's success tint and ink with a 12px tick; in a
detail card the progress bar SHALL sit 14px under the card title and 14px above
the rows. Rows stay 8px apart.

#### Scenario: Seven steps in three columns

- **GIVEN** a board record list with `presentation: "checklist"`, `progress: true` and seven rows
- **WHEN** it renders in three columns
- **THEN** the rows are 28px apart, as DqTenant "Inrichten" draws them

#### Scenario: The bar between the title and the rows

- **GIVEN** the DqTenant "Inrichten" card with its progress bar
- **WHEN** it renders
- **THEN** the bar starts 14px under the title, the first row 14px under the bar, and the card is 175px tall
