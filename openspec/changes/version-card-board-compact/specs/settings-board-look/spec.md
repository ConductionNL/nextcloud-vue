# settings-board-look Delta: version-card-board-compact

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [version-card-board-compact](../../)

## Purpose

The admin page's version card and columns look like dossiq's boards.

## ADDED Requirements

### Requirement: The board version card is compact

In the board look without new props the version card SHALL render as before (PqBeheer: an "Application name" row, 14px facts, a rule above the buttons, a disabled "Up to date" button, a primary re-import, the support footer and the description "Information about the current {app} installation"). With `compact` it SHALL show no application name row, the configured version ("Unknown" without one) followed by ", up to date" when the app tracks updates and is up to date, the update button only while an update is due, 15px facts, and its buttons under the facts without a rule; inside `CnAdminSettingsShell` the description SHALL default to "About this {app} installation.", support SHALL be one "Support" row reading the support address, "for an SLA" and the SLA address, and re-import SHALL be a secondary button. `showAppName`, `actionsDivider` and `inlineUpToDate` SHALL switch the application name row, the rule and the inline state one by one. The default look SHALL render as before.

#### Scenario: Dossiq's admin page

- **GIVEN** dossiq's shell in the board look with `compact`, up to date at 0.4.47, with the setup wizard on
- **THEN** the card reads "Over deze Dossiq-installatie.", "Versie 0.4.47", "Ingestelde versie 0.4.47, bijgewerkt", "Ondersteuning support@conduction.nl, voor een SLA sales@conduction.nl"
- **AND** below them the secondary buttons "Configuratie opnieuw importeren" and "Installatiewizard starten"

### Requirement: The admin page can fix its columns

With `sectionColumns: 1` the board admin page and its tab panels SHALL lay the section cards in one column, and with `2` in two, folding to one below 900px. Without it the page SHALL keep fitting 420px columns.

#### Scenario: Dossiq

- **GIVEN** `sectionColumns: 1`
- **THEN** every card takes the full width, one under the other
