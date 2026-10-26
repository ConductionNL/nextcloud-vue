---
kind: code
---

# Proposal: board-settings-save-ready

## Summary

The boards draw a settings card's Save ("Opslaan") ready to press; live disabled it until a field changed, so every board settings card's Save read grey (r31 verdicts: DqBeheerinstellingen x3, DqInstellingen, DqInstellingenAlgemeen x2). In the board look Save is disabled only while saving; pressing it with nothing changed sends nothing. The Nextcloud look keeps disabling it until something changed.

## Scope

- `CnSettingsFieldsSection.vue`, a jest test.

Also: \`saveVariant\` (a card whose Save is a secondary choice, DqBeheerinstellingen "Dit account gebruiken"), and an image field's upload button carries the upload icon the boards draw (DqInstellingenAlgemeen "Ander logo").
