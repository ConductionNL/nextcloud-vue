---
kind: code
---

# Proposal: facts-label-from-path

## Summary

Board DqSociaalDomein names the case's handler "Regisseur". The same report card on an objection case says
"Behandelaar". The coordinator decided (24 Oct) that the handler label is case-type configuration, not a second card
or a board amend.

A facts row may now declare `labelPath`: a path on the record or on the detail page's `@context` records
(`@context.caseType.handlerLabel`). When the value there holds text, it labels the row; otherwise `label` does. Both
go through the host translate.

## Scope

- `src/components/CnFactsWidget/CnFactsWidget.vue` (injects `cnDetailVisibilityRows`, which CnDetailPage already
  provides).
- No schema change: the facts `content` is open.
