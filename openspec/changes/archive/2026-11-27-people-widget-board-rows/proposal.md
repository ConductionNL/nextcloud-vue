# Proposal: people-widget-board-rows

## Why
The launchpad boards (LpVandaag, LpIntranet) draw the people widgets as a card's list rows: a hairline over every row,
the first too, flush with the card's inset, the name 15px bold over 13px muted lines. "Nieuwe collega's" and
"Verjaardagen" have no search box. Live (compdiff, 27 Nov) the rows had no rules, an extra 8px inset (27 vs 19 px from
the card edge) and every people widget showed a search box with a refresh button.

## What changes
- `content.showSearch: false` leaves the search box and its refresh button out (default: shown, as before).
- Board look: in a widget card the people widget has no padding of its own; its list layout is ruled rows (10px above
  and below, hairline over every row), name 15px bold, lines 13px muted; the list marks itself `cn-board-ruled-rows`.
