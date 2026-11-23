# choice-matrix-removable-rows Delta: choice-matrix-removable-rows

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [choice-matrix-removable-rows](../../)

## Purpose

A user removes a row that no longer belongs in a choice matrix, such as a mapping whose question is gone.

## ADDED Requirements

### Requirement: A choice matrix can offer to remove a row

With `removableRows`, `CnChoiceMatrix` SHALL draw a Remove button on every row, named after the row, in the grid and with `pickPerRow`. A row with
`removable: false` SHALL keep no button, and `readOnly` SHALL hide them all. Remove SHALL emit `update:modelValue` without that row's entry and
`remove-row` with the row id. A screen reader SHALL hear which row was removed, and the focus SHALL stay in the grid.

#### Scenario: Board PqIntakeFormulier, a question that is gone

- **GIVEN** a row "Old question" with an error and `removableRows`
- **WHEN** the user presses "Remove Old question"
- **THEN** `remove-row` is emitted with its id and the map loses its entry
- **AND** the status reads "Removed Old question." and the focus moves to the Remove button now in that place

#### Scenario: A row that opts out

- **GIVEN** `removableRows` and a row with `removable: false`
- **THEN** that row shows no Remove button

#### Scenario: Read only

- **GIVEN** `removableRows` and `readOnly`
- **THEN** no row shows a Remove button and the grid has no actions column
