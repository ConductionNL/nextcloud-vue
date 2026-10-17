---
kind: code
---

# Proposal: admin-shell-support-end

## Summary

The board PqBeheer ends the admin page with Ondersteuning as its own wide card: one row with the title, the support line and the SLA line. `CnAdminSettingsShell` drew support only in the version card's footer, so pipelinq hid it (`showSupport: false`) and built the card itself.

`supportPosition: "end"` draws the support lines as the last, wide card on the first tab; the default `card` keeps them in the version card. In the board look the card is one compact row.

The same board's version card shows "Ingestelde versie". `CnVersionInfoCard` drew that row only when the app passed a value; in the board look it now always draws it, reading "Onbekend" until the app passes the configured version (prop or the `configuredVersion` initial state).

## Scope

- `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`, `src/components/CnVersionInfoCard/CnVersionInfoCard.vue`, `src/css/look-board.css`, docs.
- No schema change.
