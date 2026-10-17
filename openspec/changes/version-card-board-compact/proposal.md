---
kind: code
---

# Proposal: version-card-board-compact

## Summary

The boards DqBeheerinstellingen and DqInstellingenAlgemeen draw the version card compact: "Versie-informatie", one line "Over deze Dossiq-installatie.", three rows (Versie; Ingestelde versie "0.4.47, bijgewerkt"; Ondersteuning "support@conduction.nl, voor een SLA sales@conduction.nl"), then two secondary buttons, "Configuratie opnieuw importeren" and "Installatiewizard starten". The board look drew a tall card: a "Naam van de app" row, a separate disabled "Bijgewerkt" button, a primary re-import button and an Ondersteuning sub-heading with two paragraphs.

In the board look only:

- `CnVersionInfoCard` drops the application name row, always draws the configured version with the up-to-date state inline, shows the update button only while an update is due, and draws its buttons under the facts with no rule above (15px facts, values at weight 500).
- `CnAdminSettingsShell` gives the card the description "About this {app} installation.", puts support in one row with the SLA address, and draws re-import as a secondary button. The Dutch setup label becomes "Installatiewizard starten", as the boards write it.
- `sectionColumns` (1 or 2) fixes the number of card columns: dossiq's boards draw one, launchpad's two (one again in a narrow window). Empty keeps today's auto-fit.

The default look is unchanged. PqBeheer drew a rule above the buttons and an application name row; dossiq's boards are followed, as the newer design.

## Scope

- `src/components/CnVersionInfoCard/CnVersionInfoCard.vue`, `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`, `src/css/look-board.css`, `l10n/en.json`, `l10n/nl.json`, docs.
- No schema change.
