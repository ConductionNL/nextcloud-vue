# Proposal: detail-pill-label-tokens

## Why

Board DqZaaktype (and DqZaaktypeOverzicht, DqZaaktypeVelden) draws the case type's status pill as "Versie 4
gepubliceerd" or "Versie 5 concept". A header pill's `labels` mapped a value to a fixed text, so the page could say
"Gepubliceerd" but not which version (COMPDIFF r24: pill "Gepubliceerd" extra on live).

## What changes

`CnDetailPage` fills `{field}` tokens in a header pill's translated label from the record (the `fillTemplate`
tokens). A field the record does not have is left out of the label.

## Reach

Every `typePill` / `statusPill` whose label carries a token. No schema change.
