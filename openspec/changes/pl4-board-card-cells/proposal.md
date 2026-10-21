# pl4-board-card-cells

## Why

pipelinq's pipeline card draws its priority as a coloured badge, its value in the lead's currency, its days in stage
with a stale flag and its close date with an overdue mark. A board card drew its fields as plain text, so the card
stayed a custom component.

## What changes

- CnBoardView takes `cardCells` (`config.board.cardCells`): a card field with a cell config is drawn through
  CnCellRenderer with the card as its row, as a table column would draw it.

## Fleet reuse

- pipelinq's pipeline card; shillinq's deal and invoice cards; dossiq's case card.
