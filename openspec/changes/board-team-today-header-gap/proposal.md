# Proposal: board-team-today-header-gap

## Why

r36 (DQ-L5, nc-vue 2.163.0) measured DqTeamwachtrij "Team vandaag" with its first member 10.4 under the title row against the board's 14. The board draws the card as a column with a 14px gap, and its note ("6 van 6 aanwezig") at normal leading, so the title row is as tall as the title. Live set the note at Nextcloud's 1.5 leading (title row 19.5 against 18) and started the content at the side panel's 12px less the first line's leading.

## What changes

Board-look CSS only, in `src/css/look-board-index.css`: a side panel card's header note at normal leading, and a team workload list 14px under the header. No schema change.
