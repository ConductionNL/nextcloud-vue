---
kind: code
---

# Proposal: value-map-formatter

## Summary

Board DqOrganisaties shows Rechtsvorm as "BV", "Eenmanszaak", "Vereniging" and "Stichting". The KvK stores
"Besloten Vennootschap". A column could map stored values to labels only through `enum` + `enumLabels`, which
draws a status badge. The coordinator decided (24 Oct) on a display map in config.

A built-in `valueMap` formatter shows `formatterOptions.map[value]` when the map names the value, and the value as
stored otherwise. It is text, so the column keeps its plain look.

## Scope

- `src/utils/builtInFormatters.js`: `formatValueMap`, registered as `valueMap`.
- No schema change (`formatter` is a free name, `formatterOptions` an open object).
