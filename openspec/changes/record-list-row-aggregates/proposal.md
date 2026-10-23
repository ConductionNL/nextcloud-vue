# Proposal: record-list-row-aggregates

## Why

DqZaaktype's Versies card reads "Versie 4, 2 okt 2026 · 31 lopende zaken": per version, how many running cases use it. A
table column can already count a row's related objects (`aggregate`); a record list cannot.

## What changes

- The per-row request of a table's `aggregate` column moves into `utils/rowAggregate.js` (`fetchRowAggregate`,
  `resolveRowWhere`); CnDataTable uses it unchanged in behaviour.
- CnRecordListWidget takes `content.aggregates` (`{ key: { register, schema, op, field?, where } }`), asks each figure per
  row shown through the same helper, and offers it to the row's templates as `{key}`.

## Scope

nextcloud-vue only. Widget content is not validated per key: no schema change. dossiq uses it on the case type Versions
card (DQ-ADMIN).
