# Proposal: board-dashboard-card-header

## Why

The boards draw a dashboard card's title with no rule under it, on the card's side inset (DqMijnWerk "Mijn taken" and
"Mijn 14 zaken per stap": 22px from the top, 24px from the side; DqDashboard: 20px and 22px). Of 1,417 board sources
only 11 draw a rule under a card title, none of them a dashboard. Live, every dashboard card in the board look drew the
wrapper's Nextcloud header: 12px 16px over a rule, so the title sat 8px left of the rows below it. Two earlier changes
removed the rule card by card (bar lists, boxed stat tiles), and every other card kept it.

## What changes

In the board look a dashboard card draws no rule under its title (the Nextcloud dashboard chrome keeps its own
header). A bordered card's header is padded 20px at the top, `--cn-board-dashboard-card-inset` (24px) at the sides and
12px above the content, so the title lines up with the record list, saved views and card grid rows, which already sit
24px in. The per-widget rule for bar-list and matrix cards goes: the general rule covers it.
