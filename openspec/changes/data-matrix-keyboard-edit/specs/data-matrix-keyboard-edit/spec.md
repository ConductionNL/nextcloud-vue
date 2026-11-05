# data-matrix-keyboard-edit Delta: data-matrix-keyboard-edit

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [data-matrix-keyboard-edit](../../)

## Purpose

A CnDataMatrix cell that can be edited by mouse can be edited by keyboard and is announced to screen readers.

## ADDED Requirements

### Requirement: Editable matrix cells work from the keyboard

Every editable CnDataMatrix cell SHALL be reachable with Tab and SHALL carry `role="button"` and an accessible name
made of its column label, its row label and its displayed value ("empty" when it has none). Enter or F2 on a focused
cell SHALL open it for editing and focus an input named by its column and row label. In the open cell Enter SHALL
commit the edit and emit `cell-edit` once, and Escape SHALL cancel it without emitting; both SHALL return focus to the
cell. A read-only cell, a formula cell and every cell of a matrix with `readOnly` SHALL stay out of the tab order and
carry no role or name, as before.

#### Scenario: Edit a cell without a mouse

- **GIVEN** a matrix with the editable column Q1 and the row Alpha holding 10
- **WHEN** the user tabs to the cell
- **THEN** a screen reader announces "Q1, Alpha: 10, button"
- **WHEN** the user presses Enter, types 42 and presses Enter
- **THEN** `cell-edit` is emitted once with the value 42
- **AND** focus is back on the cell

#### Scenario: Cancel an edit

- **GIVEN** a cell opened with F2
- **WHEN** the user types 99 and presses Escape
- **THEN** no `cell-edit` is emitted and focus is back on the cell

#### Scenario: A read-only matrix is unchanged

- **GIVEN** a matrix with `readOnly`
- **THEN** none of its cells is in the tab order or carries a role
