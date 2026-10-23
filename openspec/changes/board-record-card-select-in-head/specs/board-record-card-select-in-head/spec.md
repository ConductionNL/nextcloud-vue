# board-record-card-select-in-head Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-record-card-select-in-head](../../)

## ADDED Requirements

### Requirement: A selectable board record card heads with its checkbox and its pill on one row

In the board look a selectable card with a record layout SHALL draw its selection checkbox at the start of the head row
and the head pill at the end of that row, before the row menu. It SHALL NOT draw the checkbox on a row of its own.

#### Scenario: DqZakenSorteren

- GIVEN the cases cards view in the board look, rows selectable
- THEN each card's first row holds the checkbox on the left and "Wacht op inwoner" on the right
