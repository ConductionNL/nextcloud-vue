---
kind: code
---

# Proposal: screens-record-list-row-action

## Summary

Board DcMijnActies is a work list in sections across schemas: "Voorstellen om te beoordelen", "Stemmingen voor u" and
"Actiepunten". Each section has its count after the title and an optional link on the right. Each row has a title
link with a meta line, a status pill, a date and one action button ("Beoordelen", "Stem uitbrengen", and "Afronden"
or "Starten" by status).

A dashboard of `record-list` cards already draws the sections, rows, pills, due dates and header links. Two things
were missing:

- `rowAction` on the record list: one action that ends each row, its label picked per row by a field.
- `headerCount`: the list reports its total, and the dashboard card draws it as a chip after the title.

The side card ("Volgende vergadering") is out of scope here.

## Scope

- `src/components/CnRecordListWidget/CnRecordListWidget.vue`: `rowAction`, `headerCount`.
- `src/components/CnDashboardPage/CnDashboardPage.vue`: keeps a reported `count` and draws it in the card's
  `title-meta` slot.
- `docs/components/cn-record-list-widget.md`.
- No schema change: widget `content` is open in the v2 manifest schema.
