# board-selection-box-flush Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-selection-box-flush](../../)

## ADDED Requirements

### Requirement: A card's and a row's selection box sits where the board draws it

In the board look the selection box in a record card head and in a list row SHALL draw without NcCheckbox's side padding; a list row's box SHALL start 18px into the row.

#### Scenario: DqTeamwachtrij

- GIVEN a queue row with its box
- THEN the box starts 18px in and the wait text 50px in
