# Proposal: detail-table-strong-title

## Why

Board PqOfferte draws the quote's lines with each product name at 14px weight 600 in the main ink. The quote page sets `rowTitle: "strong"` on its lines list, but in a detail page card the rule that draws row names in the link colour carries more weight than the `strong` rule, so live drew the names in the link colour.

## What changes

- look-board-detail.css: in a detail page card, a table with `rowTitle: "strong"` names its rows at 14px weight 600 in the main ink. Other card tables keep the link colour; `rowTitle: "text"` keeps the body ink.
