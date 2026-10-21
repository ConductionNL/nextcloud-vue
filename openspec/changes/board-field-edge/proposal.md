# Proposal: board-field-edge

## Why

The boards draw every text field and select with a 1px border in the 3:1 control colour (#828a95) all round. Outside
the dialogs and the settings cards, which already drew it, live draws NcInputField's edge as a shadow: a dark bottom
line and 30% grey on the other sides. COMPDIFF r21: `borderColor rgb(130, 138, 149)>color(... / 0.35)` on the page
filters of DqProcesanalyse and DqDoorlooptijd, the case history filter, DqTermijnen "Jaar", the index search field and
DqBeheerinstellingen "Register" (8 fields on 7 boards).

## What changes

In the board look a text field or textarea (NcInputField, NcTextArea, and NcSelect's search box, which is an
NcInputField) draws a 1px border in `--cn-board-control-border` with the board radius and no shadow. A multiple select
draws that edge on its toggle, around its chips and search box, which stays bare. Focus keeps NcInputField's own ring.

## Scope

Board-only, `look-board.css`. Heights are a separate change. WCAG: the edge is the 3:1 control colour.
