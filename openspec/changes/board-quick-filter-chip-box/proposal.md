# Proposal: board-quick-filter-chip-box

## Why

The boards draw the selected quick-filter chip as a filled pill without a border (DqZaken, DqWerkbord, DqKlachten
"Alles": border 0, 14px at both sides) and a chip's count as a 16px bubble: a 12px figure at the font's normal line
height with 1px of padding. Live the selected chip kept a transparent 1px border and the count a 1.4 line height, an
18.8px bubble (COMPDIFF r19: "Alles" border 0 > 1 on three boards, the count h 16 > 18.8 on five).

## What changes

In the board look the selected saved-view or quick-filter chip has no border and the chip count uses the normal line
height. Plain Nextcloud is unchanged.
