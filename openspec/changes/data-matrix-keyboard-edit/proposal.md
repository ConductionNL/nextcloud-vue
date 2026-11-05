# Proposal: data-matrix-keyboard-edit

## Why

An editable CnDataMatrix cell opened only on a mouse click. A keyboard or screen reader user could not reach a cell,
open it or hear what it held, which fails WCAG 2.1.1 (Keyboard) and 4.1.2 (Name, Role, Value).

## What changes

- Every editable cell is in the tab order (`tabindex="0"`, `role="button"`) with a name made of its column, row and
  value.
- Enter or F2 opens a focused cell; the input is named by its column and row.
- Enter commits and Escape cancels; both return focus to the cell.
- Read-only cells, formula cells and a matrix with `readOnly` stay out of the tab order, as before.
