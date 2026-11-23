# Proposal: record-last-change-in-widgets

## Why

DqContact and DqOrganisatie draw the "Historie" side card as "Laatst gewijzigd op 3 oktober door Pieter Jansen". A record
does not say who changed it last; its audit trail does. `headerMetaLastChange` (header-meta-last-change) reads the
newest create or update entry, but only the header meta line could use it, so the side card showed the date alone.

## What changes

- CnDetailPage takes `recordLastChange` (manifest `config.recordLastChange`), which reads the same entry as
  `headerMetaLastChange`, and provides the entry as `cnRecordLastChange` whenever either is on.
- CnFactsWidget reads that entry as `_lastChange.*` on the record it shows (not on a fetched source), so a part
  `{ "path": "_lastChange.userName", "label": "by" }` reads "by Pieter Jansen", and is left out until it is read.

Stacked on `feat/r23-header-meta-last-change`. No schema change.
