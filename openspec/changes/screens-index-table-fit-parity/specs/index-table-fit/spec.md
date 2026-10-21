# index-table-fit Delta: screens-index-table-fit-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-index-table-fit-parity](../../)

## Purpose

The index table inside its card at 1440px, as the PqTickets board draws it.

## ADDED Requirements

### Requirement: The board index table fits its card

Under the board look, the table in CnIndexPage's table card SHALL be no wider
than the card. The selection and row-menu columns SHALL keep their width. The
first data column SHALL take 18% of the table, and the other data columns SHALL
share the rest unless a column declares its own `width`. A cell value that does
not fit SHALL be cut with an ellipsis on one line. A header's filter button
SHALL stay inside its header. The cell padding is set by board-table-density.
Without the board look the table SHALL keep
its auto layout.

#### Scenario: PqTickets at 1440px

- **GIVEN** a ticket index page under the board look with seven text columns, long subjects and client names, and row menus, in a 1440px viewport
- **WHEN** it renders
- **THEN** every header and every row menu ends inside the table card, and long values end in an ellipsis

@e2e include Measured on the harness (`e2e/screens-index-table-fit-parity.e2e.js`); live on pipelinq/PqTickets.

#### Scenario: Without the board look

- **GIVEN** the same page without `look: "board"`
- **WHEN** it renders
- **THEN** the table keeps `table-layout: auto` and its width as before
