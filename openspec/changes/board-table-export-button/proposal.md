# Proposal: board-table-export-button

## Why

The boards draw a table's "CSV exporteren" as a neutral 40px control: main text at 14px/600 on the main background
with the control border (DqTermijnen). Live it is Nextcloud's 34px borderless tertiary button, in the theme's button
ink (the primary under thematiq). COMPDIFF r22 DqTermijnen: `h 40>34`, `border 1>0`, `color`.

## What changes

CnWidgetObjectTable's export row gets the modifier class `cn-widget-object-table__footer--export`. In the board look
that row hands the button the main text as its ink, and its button is the neutral 40px control.

## Scope

CnWidgetObjectTable.vue (one class), look-board.css. The create-actions row is unchanged. No schema change.
