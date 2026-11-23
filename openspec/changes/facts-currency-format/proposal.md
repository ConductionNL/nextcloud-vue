---
kind: code
---

# Proposal: facts-currency-format

## Summary

The shillinq invoice and customer pages show amounts in a facts widget, and they read as raw numbers ("1234.5") where
the boards show money ("€ 1.234,50"). A table cell and a record-list template already format money through
`formatMoney`; the facts widget had no such format.

A facts entry (or a part of a `line`) now takes `format: "currency"`, with optional `currency`, `currencyField` and
`decimals`. The currency resolves as everywhere else: the entry's `currency`, else the record's `currencyField`, else
the app's reporting currency (`currency` in the injected app config), else EUR.

## Scope

- `src/components/CnFactsWidget/CnFactsWidget.vue`: `format()` gains the `currency` branch and reads the record.
- No manifest schema change: a facts widget's `content` is not validated field by field.
- Entries without `format: "currency"` render as before.
