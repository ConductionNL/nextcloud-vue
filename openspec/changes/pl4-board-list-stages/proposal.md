# pl4-board-list-stages

## Why

pipelinq's pipeline board (2,160 lines) exists partly because a lead's stage is not a referenced row: it is a name in
the `stages` list of the lead's pipeline. The index page's board can take columns from referenced rows, but not from a
list on one. It also had no way to keep a won or lost stage out of the way.

## What changes

- A board column field's `source` takes `itemsPath` and `keyField`: the columns are the items of a list on each
  referenced row, keyed by the stored value and linked to their row under `_parent`, so `narrowBy` and the `narrow`
  select pick the pipeline.
- `closedField` marks a closed stage; CnBoardView draws its column collapsed with its count until the reader opens it.
- Manifest schema 2.139.0 takes the three keys (the integrator renumbers).

## Fleet reuse

- pipelinq's lead board, shillinq's deal board, any record whose stages live on a parent configuration object.
