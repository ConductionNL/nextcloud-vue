# data-table Delta: board-index-wrap-cell

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-index-wrap-cell](../../)

## ADDED Requirements

### Requirement: A board index column can wrap its value

In the board look, an index table cell SHALL show its value on one line cut with an ellipsis, unless its column sets
`cellClass: "cn-cell--wrap"`; such a cell SHALL wrap its value over as many lines as it needs, breaking inside a word
only when the word alone does not fit.

#### Scenario: DqTaken task title

- **GIVEN** the Tasks index in the board look with `{ key: "title", width: "150px", cellClass: "cn-cell--strong cn-cell--wrap" }`
- **AND** a task titled "Bezwaarschrift aanvullen bij de indiener"
- **THEN** the title shows in full over three lines, not "Bezwaarschrift a..."
