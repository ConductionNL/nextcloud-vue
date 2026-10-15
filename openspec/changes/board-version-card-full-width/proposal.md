---
kind: code
---

# Proposal: board-version-card-full-width

## Summary

Under the board look the admin settings shell lays its cards on a grid of columns of at least 420px. The version card (CnVersionInfoCard) took one column, while the board draws it across the whole width (larpinq's admin page, board LrBeheerinstellingen).

Under the board look the version card is now a wide section (`cn-settings-section--wide`), so it spans the grid and loses NcSettingsSection's 900px cap, as any wide section does. CnVersionInfoCard takes `wide` (default `true`) and the shell takes `versionCardWide` (default `true`), so an app whose board draws the version card as one card in the grid can keep it there. Without the board look nothing changes.

## Scope

- `src/components/CnVersionInfoCard/CnVersionInfoCard.vue`: `wide` prop, passed on to CnSettingsSection under the board look.
- `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`: `versionCardWide` prop, passed to its version card.
- No CSS change: the board grid already spans a wide section. No schema change.
