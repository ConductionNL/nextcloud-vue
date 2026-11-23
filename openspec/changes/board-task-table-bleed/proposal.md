# Proposal: board-task-table-bleed

## Why

COMPDIFF r22, DqZaakTaken "Taken op deze zaak": the task table's text started 39px into the card against 23px drawn
(firstRowInsetLeft and minInsetLeft), and its rows were 77px against the board's 64px. The board draws the table edge
to edge in the card: it runs under the card's side padding and its first cell pads 22px, so the column text lines up
with the card title; head cells pad 10px 12px and body cells 14px 12px. Live kept the table inside the 22px padding with
16px cell padding, and the task name was a 34px-high button under the theme.

## What changes

In the board look only, for a task table in a detail card:

- the table runs under the card's 22px side padding;
- the first and last cells pad 22px at the outer edge, head cells 10px 12px, body cells 14px 12px;
- the task name is one text line (no button height).

The Nextcloud look is unchanged.
