# Proposal: detail-side-column-from

## Why

A detail page declares one side column for every record. dossiq's domain boards (DqSociaalDomein, DqAanbesteding,
DqBezwaar) draw their own side cards near the top and leave the generic ones out, and which cards a case shows is a
property of its case type (Ruben, 18 October 2026: side cards are configurable per case type). Conditions alone cannot
do it: `visibleWhen` can hide a card but cannot order the column, and it has no operator for "this card's id is in a
list the case type keeps".

## What changes

- `config.sideColumnFrom` (CnDetailPage `sideColumnFrom`): a field path, read like a `visibleWhen` field, e.g.
  `@context.caseType.sideCards`. When the value is a non-empty list of ids, the side column is those `sideColumn`
  entries in that order; each still follows its own `visibleWhen`, and an id that names no entry is skipped.
- Any other value, or no value, keeps `sideColumn` as declared. Edit mode shows every entry.
- The manifest schema gains the key.
