# Proposal: board-settings-table-flat

## Why

COMPDIFF r23 measured the tables in admin settings sections (DqInstellingen "Koppelingen", DqVthInstellingen
"Activiteiten uit het Omgevingsloket" and "Legesregels") with `content.firstRowInsetLeft 35>23`. The boards draw each
table straight on the section card, with its cells 12px in. Live draws the board table card (1px border, 12px corner)
a second time inside the section, so the first thing inside the section is that card's edge.

## What changes

In the board look a table inside a settings section has no border or corner of its own. The Nextcloud look and tables
outside a settings section are unchanged.
