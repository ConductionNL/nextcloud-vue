# Proposal: board-record-card-foot-leading

## Why

r36 (DQ-L5, nc-vue 2.163.0) measured the DqZakenSorteren cards row without a handler 218 tall against the board's 214, which put the last row and the pager 4-8px low. The board writes a record card's footer line ("—" and the deadline) at 14px with normal leading; live took Nextcloud's 1.5 leading (21 against about 17). A footer with a handler's initials is as tall either way, so only those rows moved.

## What changes

Board-look CSS only, in `src/css/look-board-index.css`: the record card footer at normal leading. No schema change.
