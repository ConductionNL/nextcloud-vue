# Proposal: user-settings-one-section

## Why

Board DqPersoonlijkeInstellingen shows only the panel of the selected navigation entry. The board user settings dialog
showed every section one under another, so "Zaaktypen in mijn menu" ran into "Meldingen" with its long table.

## What changes

- The board user settings dialog shows only the current section; the others stay mounted but hidden, so their state
  survives a switch.
- Picking an entry moves focus to the shown section's heading; the entry keeps `aria-current`.

The dialog is drawn under the board look only; the Nextcloud look keeps NcAppSettingsDialog. No schema change.
