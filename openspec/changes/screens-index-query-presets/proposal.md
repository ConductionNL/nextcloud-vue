---
kind: code
depends_on: []
---

# Proposal: screens-index-query-presets

## Summary

dossiq gap 12a. The DqWooVerzoeken board is its own list: lenses Alle, Binnen
termijn, Termijn deze week, Te laat, Gepubliceerd, Opgeschort, and columns
Zaak, Verzoeker, Ontvangen, Wettelijke termijn, Fase, Behandelaar, Publicatie.
Hydra gate-68 does not let dossiq add a second index page over the same
schema; it asks for a menu entry with a query preset (`?caseType=<uuid>`) on
the Cases list instead. A query preset today can only filter, so the Woo
entry shows the Cases lenses and columns.

This change lets an index page declare `config.queryPresets`: per query, the
lenses, columns, title and list copy the page shows while that query is in
the address. The menu entry stays a plain query link and gate-68 stays
satisfied.

## Reference screens

| Screen | Live board |
|---|---|
| `dossiq/DqWooVerzoeken` | https://identity.conduction.nl/screens/board?id=dossiq/DqWooVerzoeken |

## Out of scope

- The Active line naming the case type instead of its id (gap 12b) is in
  `screens-active-filter-line-parity`.
- A preset cannot change the register, schema, actions or permissions.

## Impact

Additive: one manifest key (schema 2.79.0), resolved in `CnPageRenderer`.
Pages without the key render as before.
