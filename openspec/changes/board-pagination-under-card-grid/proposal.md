# Proposal: board-pagination-under-card-grid

## Why

The boards draw the page footer in two places. In a table card it is the card's last row, 12px 16px under a hairline
(DqZaken, DqTaken, DqZaaktypen). Under a card grid it is a plain row under the cards, 4px 0 with no hairline
(DqAanMijToegewezen, BqAgents, BqStore). The board look drew the table card's footer under a card grid too.

## What changes

Under a card grid (an index page's main area that is not a table card) the board page footer draws 4px 0 without the
hairline. The table card's footer is unchanged.

## Scope

Board-only. DqTaken and DqZaaktypen already draw the footer inside their table card; their r20 "extra toolbar" item is
the measuring tool reading the footer as a toolbar and the board's `<nav>` row as none.
