---
kind: code
---

# Proposal: record-list-footer-action

## Summary

Board DqBezwaar ends its Beroep card with a disabled "Beroep registreren" button and the reason under it ("Kan zodra de beslissing is verzonden"). A record-list could end a row with an action, but not the card. `footerAction` adds one action under the list (also under the empty text), with `disabledWhen` and `disabledReason`.

Board DqSociaalDomein shows a special-category notice when a case's data categories hold any special one. `in` compares a value as a whole, so a list value never matched. The visibleWhen operator `anyOf` matches a list value that shares an entry with the listed values.

## Scope

- `src/components/CnRecordListWidget/CnRecordListWidget.vue`: `content.footerAction`.
- `src/utils/visibleWhen.js`: `anyOf` in `compareVisibleWhen`, so every visibleWhen surface reads it.
- Manifest schema: `anyOf` joins the visibleWhen `op` enum; `footerAction` is a new record-list content key. Both ride the next batch bump.
