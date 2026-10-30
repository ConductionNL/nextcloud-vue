# board-tables: delta for detail-table-strong-title

## ADDED Requirements

### Requirement: A detail card table with a strong row title names its rows in the main ink

In the board look, a table inside a detail page card whose list sets `rowTitle: "strong"` MUST draw its title column at 14px weight 600 in the main ink. The row MUST stay a link.

#### Scenario: the quote's lines

@e2e exclude Asserted in tests/css/lookBoardDetailTableTitleCells.spec.js; the pixel check against board PqOfferte covers the drawn table.

- GIVEN a quote page whose lines list sets `rowTitle: "strong"`
- WHEN the user opens the quote in the board look
- THEN each product name is 14px, weight 600, in the main ink
- AND clicking the row still opens the line
