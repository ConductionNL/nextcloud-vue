# data-table-framed Delta

## ADDED Requirements

### Requirement: A data table in a card can be framed

A `CnDataTable` with `framed` SHALL, in the board look, draw its table in a 1px frame with an 8px radius, inset its
first and last cells 18px, pad its rows 12px, and rule the head and every row but the last. Without `framed` the table
SHALL draw as before.

#### Scenario: The purchase history at the till

- **GIVEN** PqKassa's "Aankoopgeschiedenis" card with a `CnDataTable` that sets `framed`
- **THEN** the table sits in a frame inside the card, its first column 18px in, as the board draws it
