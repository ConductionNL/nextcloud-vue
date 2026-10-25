---
kind: code
---

# Proposal: index-table-filter-chips-once

## Summary

DqContracten showed its status filter twice: once on the board Active line ("Actief: Status: actief en verlopend ×") and once more as a chip strip inside the table card ("Status: Actief, Verlopen, in afbouw ×"). The board draws only the Active line. CnDataTable gets `filterChips` (default true); CnIndexPage turns it off in the board look, where its Active line lists the same filters. The header's filter mark stays.

## Scope

- `src/components/CnDataTable/CnDataTable.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, tests. No schema change.
