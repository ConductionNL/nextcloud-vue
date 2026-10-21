# pl4-board-card-actions

## Why

pipelinq's pipeline card lets a person assign a lead and set its priority from the card. A board card offered only
Open and Move to. And a pipeline board lists leads and requests together, from an app endpoint, narrowed to one
pipeline; an endpoint index source did not receive the page's filters, so the narrow select reached nothing.

## What changes

- CnBoardView takes `cardActions`; the index page passes the row actions named in `config.board.cardActions`, drawn
  as a CnRowActions menu on each card, the card as the row.
- An endpoint index source takes the page filters declared in `sourceConfig.searchFields`.
- Manifest schema 2.139.0 takes `board.cardActions` (stacked on pl4-board and pl4-board-card-cells).

## Fleet reuse

- pipelinq's pipeline board; any board whose cards need quick actions; any endpoint list with a sidebar or narrow
  filter.
