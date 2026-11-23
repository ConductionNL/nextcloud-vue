# Proposal: board-map-list-due-clock

## Why

COMPDIFF r24 flagged the rows of the map view's numbered list (DqZakenKaart, 9 rows) with `icon true>false`. The board
draws each row's date after the pills with a 14px clock in front of it, 13px at weight 600 in the soft text colour
("⏱ 1 nov"). Live draws the date as plain muted text without the clock.

## What changes

In the board look a map list row's date carries the clock icon, 4px before the text, at 13px weight 600 in the soft text
colour. The Nextcloud look is unchanged. No schema change.
