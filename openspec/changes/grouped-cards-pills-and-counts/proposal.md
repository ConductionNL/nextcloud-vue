---
kind: code
---

# Proposal: grouped-cards-pills-and-counts

## Summary

Board DqSociaalDomein draws the Gezinsplan card as goals with a state pill (Loopt, Gehaald) and interventions with a date and a state pill (Gepland, Bezig, Afgerond, Te laat in the error tone), and says "2 doelen, 3 interventies" under the card title. The grouped-cards widget had a count pill only. The record list's pill logic moves to `src/utils/fieldPill.js` so both read the same keys.

## Scope

- `src/components/CnGroupedCardsWidget/CnGroupedCardsWidget.vue`, `src/utils/fieldPill.js` (shared with CnRecordListWidget), docs, `tests/components/CnGroupedCardsPillsAndCounts.spec.js`.

## Out of scope

- The app manifests that configure it; this is the library half.
