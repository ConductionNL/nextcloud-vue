---
kind: code
---

# Proposal: template-cell-is-text

## Summary

PqContactmomenten has a column `{ key: "occurredAt", template: "{occurredAt|relativetime}" }`. The template filled
correctly ("vandaag, 09:42"), but the table still handed the cell renderer the schema property of `occurredAt`
(`format: date-time`), so the renderer parsed the filled text as a date again: "vandaag, 09:42" is no date and
showed "—", and "12 sep, 14:05" parsed in Chrome as 12 September 2001.

A column with a `template` now hands the renderer a plain text property, whatever the key's schema type.

## Scope

- `src/components/CnDataTable/CnDataTable.vue`: `columnProperty()`.
- No schema change.
