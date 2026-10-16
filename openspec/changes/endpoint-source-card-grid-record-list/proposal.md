---
kind: code
---

# Proposal: endpoint-source-card-grid-record-list

## Summary

The stat, delta, chart, facts and object-table widgets can read an app endpoint (`endpointSource`). A record list and a
card grid could not: they read OpenRegister only (the record list) or a fixed `objects` array (the card grid). Board
ShBank draws the bank accounts with their balances, and those balances exist only in shillinq's
`/api/v1/cash-position`, so the accounts could not be drawn.

A record list's `content.endpointSource` and a card grid's `endpointSource` prop now take the shape the other widgets
take (`{ url, method?, params?, responsePath? }`, the same token grammar), through the shared `useEndpointSource`
engine (shared requests, short cache, the page and widget refresh channels). The payload after `responsePath` is the
array of rows. The record list draws them with its usual templates, pill, avatar, row route and header count.

## Scope

- `src/components/CnRecordListWidget/CnRecordListWidget.vue`: `setup()` binds the endpoint; `fetchRows` copies its rows
  instead of asking OpenRegister when `content.endpointSource.url` is set.
- `src/components/CnWidgetCardGrid/CnWidgetCardGrid.vue`: `endpointSource` prop; `objects` given wins.
- No manifest schema change: a dashboard widget's `content` is not validated field by field.
- A record list without `endpointSource` and a card grid with `objects` behave as before.
