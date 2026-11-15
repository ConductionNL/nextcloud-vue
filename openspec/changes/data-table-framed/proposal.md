# Proposal: data-table-framed

## Why

The Pipelinq POS boards draw a table that sits straight in a card as a framed table: PqKassa "Aankoopgeschiedenis" and
the payments under Totalen, PqKassaRetour's lines, PqLoyaliteit. The frame is 1px with an 8px radius, the outer cells
sit 18px in, rows have 12px padding and a rule under the head and every row but the last. Live drew these bare
`CnDataTable`s with the card table's 12px insets. `content.tableFrame` already draws this for an object-list widget,
but these tables are a `CnDataTable` in a `CnDetailCard` of an app view.

## What changes

`CnDataTable` takes `framed`. In the board look it adds `cn-table-container--framed`: the frame, the 18px outer insets,
12px rows and the rules. The head keeps the board's card table ground.

## Reach

Opt in. The Nextcloud look ignores it. Dossiq's card tables have no frame and do not move.
