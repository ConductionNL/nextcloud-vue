---
kind: code
---

# Proposal: users-source-sortable-columns

## Summary

The members list (DqAfdelingen) draws a sort chevron on every head on the board; live the heads had none because the users source columns were not sortable, although the source sorts its members already. The four columns are now sortable. The Dutch catalogue also gains "Present" (Aanwezig) and "Absent until {date}" (Afwezig tot {date}), which read English in r29.

## Scope

- `src/composables/indexSources.js`, `l10n/nl.json`, the nl missing baseline, a jest test.
