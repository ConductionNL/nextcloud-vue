---
kind: code
---

# Proposal: board-settings-title-centred-and-link-flush

## Summary

Two board-look details on admin settings cards (r26d):

- A card with title-row buttons and no subtitle drew its title at the top of the row (21px). The boards centre it on the 34px buttons (27.5px): DqVthInstellingen "Inspectiechecklists", DqInstellingenAlgemeen "Werkdagen en feestdagen".
- The "Uitleg tonen" toggle (CnSettingsFieldsSection `hintsToggle`) was a padded tertiary button, 16px in from the card edge. DqBeheerinstellingen draws it as a text link flush with the edge.

## Scope

- `src/css/look-board.css`, a css test. No schema change.
