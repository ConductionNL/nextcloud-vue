# Proposal: board-declared-states

## Why

A status enum often holds more values than a board should draw. pipelinq's ticket `status` has eight values (new,
in progress, waiting for customer, resolved, completed, rejected, converted, closed), two of them legacy. The LijstBord
board draws four working columns and keeps the closing ones folded. The board read its columns only from the
schema's enum or lifecycle `states`, so the page could neither name, order, hide nor fold them, and an app had to
change its schema to change a picture.

## What changes

- A board's `statusField` and any entry of `board.columnFields` may carry `states`: the columns in order, each a
  value or `{ key, label?, color?, hidden?, closed? }`. When present the board reads its columns from it instead of
  the field's enum or lifecycle states. `hidden` keeps a value off the board (its cards go to "Elsewhere"),
  `closed` starts the column folded, `label` is an i18n key.
- Without `states` nothing changes. A `source` or `kind: values` column ignores `states`: its columns are rows or
  values, not declared stages.

Manifest schema: `boardView.states` and `boardView.columnFields[].states` (schema minor bump).
