---
kind: code
---

# Proposal: user-settings-dialog-board-sections

## Summary

Three gaps on DqPersoonlijkeInstellingen, measured and probed on :8080 (r25b):

- Section headings ("Weergaven in mijn menu", "Meldingen") started 12px right of the text below them: NcAppSettingsSection indents its name and description by `--app-settings-section-text-offset`. The dialog sets it to 0.
- "Weergaven in mijn menu" stood twice, as the section heading and as the list's own label. CnOrderedListField gets `hideLabel` (the label stays the list's accessible name); CnSavedViewMenuSettings, whose only host titles its section with the same words, uses it.
- The notification grid's head was grey and 36px: thematiq colours every `th` through `--nldesign-component-table-header-background-color`. The board grid sets that token to transparent and draws its head at line height 1.2 (31.5px, as measured on the board).

## Scope

- CnUserSettingsDialog, CnOrderedListField, CnSavedViewMenuSettings, CnNotificationMatrix, tests. No schema change.
