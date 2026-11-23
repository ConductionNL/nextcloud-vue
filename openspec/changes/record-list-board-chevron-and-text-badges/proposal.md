---
kind: code
---

# Proposal: record-list-board-chevron-and-text-badges

## Summary

Two record-list options for board dashboards, both opt-in.

- `content.chevron: true` keeps the row chevron on a board dashboard. The board look hid every dashboard list's chevron, but PqMijnWerk and DqMijnWerk "Verder werken" draw one at the end of each linked row.
- A field badge with `look: "text"` draws its label as words in its tone, without a ground: PqMijnWerk draws "Normaal priority" muted at 13/500 and "Hoog priority" in the error ink at 13/700 beside the kind pill. Live drew both as grey and red pills.

Without the keys nothing changes. No schema change: list content is free-form.

## Scope

- `CnRecordListWidget.vue` (root class, badge render sites, badge text style), `look-board.css` (the dashboard chevron rule), a jest spec.
