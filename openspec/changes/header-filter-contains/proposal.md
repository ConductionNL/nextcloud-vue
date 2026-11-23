---
kind: code
---

# Proposal: header-filter-contains

## Summary

The text-column header filter (table-header-sort-and-filter, #1330) matched on
equality, because OpenRegister had no contains operator on schema properties.
OpenRegister now has one (openregister#4430): `?{property}[like]={term}`,
case-insensitive, the server escapes `%`, `_` and `\`, several terms
(`[like][]`) match any of them, and an empty term adds no condition.

The text header filter now sends `{key}[like]` with the raw term, so typing
"acme" finds "Acme B.V.". The panel says "Contains". Exact matching stays where
it already was: the facet sidebar and fixed filters keep sending `key=value`,
and the header filter no longer reads or clears that key.

## Motivation

Ruben's review of pipelinq (G2): every column header sorts and filters. A text
filter that only matches the whole value finds nothing for a partial name,
which is what a person types.

## Scope

- `src/utils/columnFilters.js`: the string kind owns `{key}[like]`.
- `src/components/CnDataTable/CnColumnFilterPopover.vue`: the label reads
  "Contains".
- Docs (`cn-data-table.md`), CHANGELOG, en + nl strings, tests.

## Out of scope

- A choice between contains and equals in the panel.
- Metadata (`@self`) header filters; no metadata column filters by text today.
