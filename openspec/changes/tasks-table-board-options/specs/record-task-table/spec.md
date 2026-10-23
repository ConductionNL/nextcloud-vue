# record-task-table Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [tasks-table-board-options](../../)

## ADDED Requirements

### Requirement: The task table can show dates, its own state words and a footer link

In the `table` variant, `dueFormat: "date"` SHALL show the deadline as a short date and an overdue open task SHALL keep
its overdue styling and a visually hidden "Overdue"; `stateLabels` SHALL word a state and `stateColors` SHALL colour it,
both keyed on the raw state; `viewAllPlacement: "footer"` SHALL draw the view-all link under the table and leave it
out of the card header. Without these keys the table SHALL draw as before.

#### Scenario: DqZaakTaken

- **GIVEN** an overdue open task due 18 Oct and a completed one
- **WHEN** the table shows with these keys
- **THEN** the open row reads "18 okt" in the overdue style with "In behandeling" in purple, the done row reads "Klaar",
  and "Alle taken van deze zaak in Taken" sits under the table
