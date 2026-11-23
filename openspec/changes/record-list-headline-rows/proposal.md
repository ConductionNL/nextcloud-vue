# Proposal: record-list-headline-rows

## Why

DqDagAfsluiten's "Vandaag vastgelegd" draws each recorded note as a done mark (a 24px green circle with a check), then
one line with the kind pill, the linked title and the meta, and the note under that line in the normal ink. A `rows`
record list put the title and meta on two lines, the note as a third muted line and the pill at the end of the row, and
an icon tile was always the 36px tile on the sunken ground.

## What changes

- `headLine: true` on a `rows` list puts the pill, the title (underlined, as a link) and the meta on one line, and draws
  `text` under it in the normal ink. The pill is not drawn again at the end of the row.
- `iconTile` takes `{ size?, tone? }` besides `true`: `size` the tile in px, `tone` (`success`, `info`, `warning`,
  `error`) its ground and ink.

Without them nothing changes.

## Scope

CnRecordListWidget (rows presentation). No schema change.
