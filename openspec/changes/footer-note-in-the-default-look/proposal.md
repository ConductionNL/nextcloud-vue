---
kind: code
---

# Proposal: footer-note-in-the-default-look

## Why

An index page's `footerNote` (manifest `config.footerNote`) only appeared in the board look: CnPagination appended it
to the board count text and nowhere else. In the default look the note was never drawn. On a list that fits on one
page the footer was not even mounted. integriq's Data feeds page puts the pointer to where a feed is declared and
who may read it in that note, and the live pass found it missing (integriq#3962).

## What changes

- CnPagination, default look: a footer note is shown after the page info. On a non-empty list that needs no pager
  (one page, no more rows than `minItemsToShow`), the footer is mounted for the note and shows it alone, without
  the page info and without the page-size select.
- Without a note the default look is unchanged. The board look is unchanged.
