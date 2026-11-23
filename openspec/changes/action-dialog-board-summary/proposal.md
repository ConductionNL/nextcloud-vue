# The action dialog's summary, facts and note as the board draws them

## Why

COMPDIFF r25b DqArchiveren (24 Oct): the case summary's title was 700 at 45px from the edge (board 600 at 63px, icon on a 36px tinted tile); the facts' labels and values took the server's 12px dt/dd padding, so labels sat indented over their values with a large gap; the note "Daarna alleen lezen" showed the info icon where the board draws a lock, and its heading and text read 15px (board 14px) because thematiq sizes every paragraph with `!important`.

## What changes

- CnActionDialog: the summary icon on a 36px tile in the light primary tone; title 15px/600, meta 13px; facts' dt/dd padding and margin 0; `note.icon` names the note's icon.
- look-board.css: a board info note's paragraphs and heading keep the note's size with `!important`.

## Impact

CnActionDialog and the board look. No schema change (dialog config is open).
