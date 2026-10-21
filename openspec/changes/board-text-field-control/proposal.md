# Proposal: board-text-field-control

## Why

board-select-control (fix/r23-board-select-control) makes a board select the board's control: a 1px edge in the 3:1
control colour, 40px tall, 36px in a filter row. Two cases stay open. A text field and a textarea still draw
NcInputField's and NcTextArea's shadow edge, and the index side panel's text fields are 30px (DqZakenSorteren's search
field, `h 40>30`). A multiple select also got the edge on its search box, inside the toggle that holds its chips, so
it drew a box within the box.

## What changes

In the board look a text field and a textarea draw the 1px control edge and no shadow. The index side panel's text
fields are 40px tall. A multiple select draws the edge on its toggle, and its search box has no border.

## Scope

Board-only. Stacked on board-select-control; merge after it.
