---
kind: code
---

# Proposal: slot-grid

## Summary

Ruben, 11 Oct 2026: pages are manifest configuration over abstract widgets. learniq's standby planning
(StandbyPlanning, 302 lines, plus a 198-line add dialog) lays the standby slots out as a grid: one row per time
window, one column per weekday, the teachers on standby in each cell, an add button per cell that opens the create
form seeded with the cell, and a remove per teacher. humaniq shift and on-call rosters and planninq are the same shape.
CnDataMatrix holds values per cell, not lists of objects, and CnWeekStripWidget has one axis.

The `slot-grid` widget (CnSlotGrid) reads every object of one schema, lays them out by a row value and a column value,
adds through the schema's create form seeded with the cell (CnActionButtons owns the form), and removes after a
confirm.

## Scope

New widget, docs, unit tests. No schema change.
