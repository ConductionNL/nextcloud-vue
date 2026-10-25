---
kind: code
---

# Proposal: audit-card-stacked-rows

## Summary

Board DqTaak's Historie card draws "Taak opgepakt door Pieter Jansen" with "6 okt 09:05" under it. Live drew the date
on the right of the action and the user id ("pieter") under it.

- An audit trail widget may say `content.layout: "stacked"`: the action, then one muted line with the moment in the
  board's short form and who, unless the action already names them.
- A person's user id reads as their display name in every layout (userDisplayName).
- The board look draws a stacked row 12px above and below, the action 15px weight 600.

## Scope

- `CnAuditTrailCard.vue`, `CnAuditTrailWidget.vue`, `look-board.css`.
- No schema change.
