---
kind: code
---

# Proposal: column-cell-pills

## Summary

Board DqContacten draws a pill "Geheimhouding" beside the BSN of a resident whose data is protected
(`indicatieGeheim`). A table column could show its value, a secondary line, or a whole cell widget, but no pill beside
the value that depends on another field of the row.

A column may now declare `pills: [{ field, <condition>, label, variant? }]`. Each pill whose condition holds on the
row (the row-indicator grammar) draws as a `CnStatusBadge` beside the value, its label translated. In the board look
the value and its pills stay on one line.

## Scope

- `src/components/CnDataTable/CnDataTable.vue`: `cellPills`, the pill strip in the data cell.
- `src/css/table.css`, `src/css/look-board-index.css`: the strip beside the value.
- `CnDataTable.md`: the `col.pills` section.
- No schema change (column objects are open).
