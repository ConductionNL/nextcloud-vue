---
kind: code
---

# Proposal: detail-edit-form-header-from-record

## Why

Board PqTicketBewerken (pl6, 30 Oct) draws the ticket edit form with an eyebrow over the title ("Bewerken ·
PQ-2026-0417") and a line under it that names the ticket ("PQ-2026-0417 · Verzoek"). A detail page's edit form took a
fixed title and subtitle only, so live draws "Ticket bewerken" alone and the header row is 22.5px instead of the
board's 86px.

## What changes

- CnDetailPage takes `editEyebrow` (page config): one short line over the edit form's title, run through the host
  translate. Empty (the default) shows none.
- `editTitle`, `editSubtitle` and `editEyebrow` may name the record with `{field}` tokens, filled the way the header
  line (`headerMeta`) fills them: an enum value reads its label. Text without tokens is unchanged.
