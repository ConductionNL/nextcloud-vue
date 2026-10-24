# Proposal: record-list-data-table-and-notice-footnote

## Why

Board DqZaaktype draws "Berichten aan de aanvrager" as the board's card table (a near-white 14px/600 header band,
40px rows with hairlines, 12px cell inset) and ends it with the opt-out note in a blue info box. In the board look a
record-list table is the compact grid (DqTeamwachtrij), and its footnote is a muted line.

## What changes

- `content.tableLook: "data"` on a `table` record-list adds `cn-record-list--data-table`; the board look draws it as
  its card table (as CnFilesBrowser's table). Without it the compact grid stays.
- `content.footnoteVariant` (`info`, `warning`, `error`) draws the footnote as a toned notice box with its icon.

## Reach

CnRecordListWidget and look-board-detail.css. No schema change: record-list content keys are free-form.
