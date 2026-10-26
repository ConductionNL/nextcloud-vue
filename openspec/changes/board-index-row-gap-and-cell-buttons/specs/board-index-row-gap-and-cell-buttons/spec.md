# board-index-row-gap-and-cell-buttons Delta: board-index-row-gap-and-cell-buttons

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-index-row-gap-and-cell-buttons](../../)

## Purpose

Match the index page's actions bar rows and a row's action buttons to the
dossiq list boards.

## ADDED Requirements

### Requirement: The board index bar and row buttons match the boards

In the board look the actions bar SHALL put 20px between its rows and 8px
between the items in a row, and an action button in a table cell SHALL be
34px tall. The Nextcloud look SHALL be unchanged.

#### Scenario: Search row under the views row

- **GIVEN** an index page in the board look with saved-view chips and a search field
- **WHEN** the actions bar renders
- **THEN** the search field starts 20px under the views row

#### Scenario: Row action buttons

- **GIVEN** a table column whose cells render action buttons
- **WHEN** the table renders in the board look
- **THEN** each button is 34px tall
