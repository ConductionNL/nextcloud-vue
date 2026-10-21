# board-table-density Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-table-density](../../)

## Purpose

Board tables pad their cells as the dossiq boards draw them: roomy in an index list, compact in a card.

## ADDED Requirements

### Requirement: A board table pads its cells as the boards draw them

In the board look an index page's main table SHALL pad its header cells 12px 16px and its body cells 14px 16px. With
`rowTitle: "plain"` its data cells SHALL have 12px inline padding and its title column SHALL start 18px in. Every other
board table SHALL pad its header cells 10px 12px and its body cells 11px 12px, its selection column 16px at the sides.
Outside the board look the table SHALL keep its padding.

#### Scenario: DqZaken

- **GIVEN** the cases index page in the board look
- **THEN** the "Zaak" header and its cells start 16px from their column's edge

#### Scenario: DqInstellingen

- **GIVEN** the integrations settings card in the board look with a table of connections
- **THEN** its header cells are padded 10px 12px and its body cells 11px 12px

#### Scenario: PqTickets

- **GIVEN** a ticket index page in the board look with `rowTitle: "plain"`
- **THEN** its data cells are 12px apart and its title column starts 18px from the selection column
