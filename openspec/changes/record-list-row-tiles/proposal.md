# Proposal: record-list-row-tiles

## Why

Board DqZaaktypeOverzicht draws a case type's statuses as framed tiles in two columns: a colour dot, the name at 14px
regular and the flag ("Start", "Eind", "Termijn opgeschort") at the end, each tile 8px 10px inside a hairline edge with
radius 8. The record list's `rows` draw unframed rows in one column, and its `cards` draw tall cards with a bold title
and no dot or flag (COMPDIFF r24: row "In behandeling" h 35>56.5, radius 8>12, padding 10>18).

## What changes

`CnRecordListWidget` takes `tiles: true` with `presentation: "rows"`: the rows keep everything a row draws (dot, title,
meta, flags, pills) and are laid out as framed tiles in a grid of 260px at the least, 8px apart.

## Reach

Opt in. No schema change (the record list's content is open); docs in `cn-record-list-widget.md`.
