# board-dialog-controls Delta: board-dialog-raised-label-line

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dialog-raised-label-line](../../)

## Purpose

A board dialog's labelled field sits as every dialog board draws it.

## ADDED Requirements

### Requirement: A board dialog's raised label starts the field and its control sits 23px under it

In a board dialog, a field with a raised label SHALL start its label where the field starts and its control 23px below
that.

#### Scenario: DqOverdragen

- **WHEN** a handler opens Zaak aan een ander team geven
- **THEN** "Nieuw team" starts its field and the select's box starts 23px under it
