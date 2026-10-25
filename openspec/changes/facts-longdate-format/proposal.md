---
kind: code
---

# Proposal: facts-longdate-format

## Summary

Boards DqContact and DqOrganisatie write dates in facts cards with the month spelled out and no year in the current
year:

- "Laatst gewijzigd op 3 oktober door Pieter Jansen";
- "bij het contactmoment van 4 oktober".

The facts widget offered only `date` ("4 okt") and `date-long` ("4 okt 2026"). A new entry format, `longdate`, uses
the library's `formatLongDate`: "3 oktober" this year, "3 oktober 2025" otherwise.

## Scope

- `src/components/CnFactsWidget/CnFactsWidget.vue`.
- No schema change (the facts `content` is open).
