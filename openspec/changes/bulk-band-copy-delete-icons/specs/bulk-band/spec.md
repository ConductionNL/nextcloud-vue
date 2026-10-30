# bulk-band Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [bulk-band-copy-delete-icons](../../)

## ADDED Requirements

### Requirement: Copy and Delete selected draw their icon in the band

In the board look the bulk band's built-in Copy selected and Delete selected SHALL draw their icon before the label, and
Delete selected SHALL read in the error tag ink.

#### Scenario: PqTicketsSelectie

- **GIVEN** a ticket list in the board look with rows selected
- **THEN** "Selectie kopiëren" draws a copy icon before its label
- **AND** "Selectie verwijderen" draws a bin icon and reads in the error ink
