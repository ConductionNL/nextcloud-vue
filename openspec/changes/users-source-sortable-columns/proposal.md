---
kind: code
---

# Proposal: users-source-sortable-columns

## Summary

The members list (DqAfdelingen) draws a sort chevron on every head on the board; live the heads had none because the users source columns were not sortable, although the source sorts its members already. The four columns are now sortable. The Dutch catalogue also gains "Present" (Aanwezig) and "Absent until {date}" (Afwezig tot {date}), which read English in r29. The member's name reads 15px (cell class `cn-cell--lead`), as the board draws it (row 63 vs 66).

## Scope

- `src/composables/indexSources.js`, `src/css/table.css`, `l10n/nl.json`, the nl missing baseline, a jest test.
