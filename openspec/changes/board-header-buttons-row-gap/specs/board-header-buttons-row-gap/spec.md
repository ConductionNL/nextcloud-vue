# board-header-buttons-row-gap Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-header-buttons-row-gap](../../)

## ADDED Requirements

### Requirement: The count line sits under the buttons without an empty row

In the board look with the side panel open, a list page without a breadcrumb trail SHALL draw its count line in the row under the header buttons, with no empty row between them.

#### Scenario: DqZakenSorteren

- GIVEN the Cases cards with the side panel open
- THEN the count line starts 58px under the title
