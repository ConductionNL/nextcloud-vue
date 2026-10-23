# Proposal: board-files-table

## Why

COMPDIFF r24 measured DqDocumentenBeheer's file list 16 properties away from the board: a grey header row at 15px
weight 400 with 4px 8px of padding and a bottom rule, cells at 15px with 4px 8px of padding, a grey ground on the
ticked row, the column sort label drawn as a 34px grey button at 15px/400, and a bare three-dot row menu. The board
draws the compact card table the other board tables already use: a #fafbfc header at 14px/600 in the muted ink with
10px 12px of padding, 14px cells with 11px 12px of padding and a hairline between rows, the sort label as bare text,
the file name at 600 underlined over a 14px muted second line, and the row menu as the 34px bordered square.

## What changes

In the board look CnFilesBrowser's table takes the board's compact table. The row menu reuses the board row menu rule
CnRowActions already has. A row with the host's visible button (the review list, DqZaakDocumenten) keeps its bare menu.
The Nextcloud look is unchanged.
