---
kind: code
---

# Proposal: index-footer-note-on-one-page

## Why

Board PqWachtrij (pl6, 30 Oct) ends the queue card in one line, "Oudste eerst. Een ticket verlaat de wachtrij zodra
iemand het in behandeling neemt.", with no count and no pages: a queue is worked from the top and fits on one page.
The board look's footer always draws "9 van 9 ·" before the note and "1 Volgende" after it, as the other boards do.

## What changes

- CnPagination takes `pagerOnOnePage` (default true). Off, a board footer on one page shows its footer note alone;
  more than one page is unchanged, and so is a footer without a note.
- CnIndexPage takes `pagerOnOnePage` (manifest `config.pagerOnOnePage`) and hands it to the pager.
