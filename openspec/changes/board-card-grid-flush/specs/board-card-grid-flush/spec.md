# board-card-grid-flush

## ADDED Requirements

### Requirement: The board card grid stands flush with the page column

In the board look a card grid MUST NOT pad its cards in from the page column, and the page footer under it MUST sit the
page column's gap under the last card row, read from `--cn-board-pager-gap` (12px by default).

#### Scenario: The first card starts at the column's edge

- GIVEN an index page in the board look in its cards view
- WHEN the cards render
- THEN the first card's left edge is the page column's left edge

#### Scenario: An app sets the gap under the cards

- GIVEN an app that sets `--cn-board-pager-gap: 20px` on its index pages
- WHEN a card grid is followed by the page footer
- THEN the footer starts 20px under the last card row
