# Proposal: board-timeline-title-and-header-gap

## Why

COMPDIFF pl4 measured PqKlant and PqOrganisatie "Activiteit" titled at weight 600, where the boards title it as every
board card: 17px, 700. The timeline widget titles itself, and the board look only styled that title in the side
column. The same card's "E-mail koppelen" and "Opstellen in Mail" stood 11px apart, where the boards (and the Dq
boards' title rows) draw 8: server.css gives every button `margin: 3px 3px 3px 0` at (0,2,1), which outranks the
scoped `margin: 0` of the tonal and link header buttons.

## What changes

- In the board look a timeline's own title in the main column is `--cn-board-heading-size`, 700, line height normal.
- CnWidgetHeaderActionButtons zeroes the margin of its tonal and link buttons with a doubled class.

## Reach

CSS only. Every app's timeline in a main column, every tonal or link header action.
