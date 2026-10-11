---
kind: code
---

# Proposal: screens-index-table-fit-parity

## Summary

pipelinq PqTickets at a 1440px viewport, nextcloud-vue 2.79: the index table
was wider than its card, so Wachtend, Behandelaar and the row menus sat past the
card's right edge. Measured live: the table 1503px in a 1118px card, Onderwerp
330px and Klant 314px. The board fits its columns in the card.

Cause: the table keeps `table-layout: auto`, and every cell is one line
(`white-space: nowrap`) capped at `--cn-table-cell-max-width` (22rem). With one
line per cell, a column's minimum width is its whole text up to that cap, so
seven text columns cannot shrink below the sum of their texts. The header sort
chevrons and filter funnels (#1412) add to that but are not the cause. The row
menu column overflowed only because the table did.

## What changes

Board look only, the index page's table card (`look-board-index.css`):

1. `table-layout: fixed; width: 100%`. The selection and menu columns keep their
   widths, the first data column takes 18%, and the others share the rest. A
   column's own `width` still wins.
2. A cell's value is cut with an ellipsis. CnCellRenderer already puts the full
   value in the cell's tooltip.
3. A header with a filter funnel cuts its label, not the funnel.
4. Data cells take the board's 12px inline padding (18px on the first one).

CnDataTable marks the first data column's header `cn-table-head--title`, which
is the hook for point 1. Tables outside the board look's index card are
unchanged: dashboard tiles, widgets, and the Nextcloud look.
