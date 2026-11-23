# board-dialog-select-label-room Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dialog-select-label-room](../../)

## Purpose

A select's label in a board dialog stands in its own room above the control.

## ADDED Requirements

### Requirement: A board dialog select makes room for its raised label

In a board dialog an NcSelect whose search field carries a label SHALL have a 26px block-start margin, so the raised
label stands between the select and the content above it without covering either.

#### Scenario: DqZaakLocatie "Locatie toevoegen"

- **GIVEN** the add-location dialog in the board look
- **THEN** the "Zoek een adres" label starts about 18px below the dialog title and 4px above the select
