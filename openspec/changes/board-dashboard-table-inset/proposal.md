# Proposal: board-dashboard-table-inset

## Why

The boards draw a table on a dashboard card inside the card's 22px inset, its header band and cells 12px in from the
table's edge (DqTermijnen "Ingebrekestellingen en dwangsommen", DqDoorlooptijd, DqProcesanalyse). The board look ran
the table to the card's edge and padded its first and last column 24px. COMPDIFF r21: `table x -21`, `head.paddingLeft
12>24` on 4 tables on 3 boards (handed over by NCV-CONTAINERS).

## What changes

On a board dashboard card the widget table (CnWidgetObjectTable) takes `0 22px 20px` of padding, and the rules that
padded its first and last column to the card's inset go; its cells keep the card table's 12px.

## Scope

Board-only, `look-board.css`. Supersedes the table part of board-dashboard-widget-inset.
