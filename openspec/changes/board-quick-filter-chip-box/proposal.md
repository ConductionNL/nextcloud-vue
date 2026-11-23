# Proposal: board-quick-filter-chip-box

## Why

The boards draw the selected quick-filter chip as a filled pill without a border (DqZaken, DqWerkbord, DqKlachten
"Alles": border 0, 14px at both sides). Live the selected chip kept a transparent 1px border (COMPDIFF r19: "Alles"
border 0 > 1 on three boards).

## What changes

In the board look the selected saved-view or quick-filter chip has no border. The count keeps the 14px line
board-pill-tones gives it (16px with its 1px pads). Plain Nextcloud is unchanged.
