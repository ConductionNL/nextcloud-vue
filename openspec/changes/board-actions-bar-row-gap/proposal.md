---
kind: code
---

# Proposal: board-actions-bar-row-gap

## Summary

The boards set an index page's view row (quick filters, view switch) and its search row 20px apart, as their other sections. In the board look the actions bar wrapped them with an 8px gap, so the search row and the table under it sat about 12px high (r31 verdicts: table y -9 to -18.5 on DqContracten, DqZaken, DqTaken, DqContacten). The bar's row gap is now the board section gap; items on one row keep 8px.

## Scope

- `src/css/look-board-index.css`, a css test.
