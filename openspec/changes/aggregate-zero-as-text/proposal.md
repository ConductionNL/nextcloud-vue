---
kind: code
---

# Proposal: aggregate-zero-as-text

## Summary

Board DqOrganisaties draws a count column's counts as pills ("1", "3") and an empty count as muted text ("Geen").
A count column with `widget: "badge"` drew its `zeroLabel` as a pill too, a grey "Geen" pill in every empty row.

A column aggregate may now say `zeroAs: "text"`: a count of zero (or a max with nothing to read) shows its
`zeroLabel` as muted text instead of through the column's widget. Without it nothing changes.

## Scope

- `src/components/CnDataTable/CnDataTable.vue`: the zero cell as `span.cn-table-cell__zero`.
- `src/css/table.css`: the muted ink.
- No schema change (`aggregate` is not closed in the manifest schema).
