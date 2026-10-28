# Proposal: board-card-grid-flush

## Why

r34 DqAanMijToegewezen and DqZakenSorteren: every case card stood 3.8px in from the page column and 3.8px down, and the
page footer followed the last card row 11.8px lower where the boards draw it 20px lower. card.css pads the card grid
0.25rem; the board look kept that padding, and drew the footer 8px under the grid in every app.

## What changes

- In the board look the card grid has no padding of its own, so the first card stands at the column's edge.
- The page footer under a card grid sits `--cn-board-pager-gap` under the cards: 12px unless the app sets the hook (the
  dossiq boards draw 20, BqAgents 12).

## Scope

Board look only. The Nextcloud look keeps card.css.
