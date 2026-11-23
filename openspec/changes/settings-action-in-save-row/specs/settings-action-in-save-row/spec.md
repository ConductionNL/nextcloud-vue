# settings-action-in-save-row Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: An action field can stand beside Save

A CnSettingsFieldsSection action field with `placement: 'save'` SHALL be drawn in the save row, before the Save
button, when the form draws a save row; without a save row (auto-save, inline save) it SHALL stay in the form.

#### Scenario: dossiq's payout callback secret

- **GIVEN** the Financiële integratie card with its generate action marked `placement: 'save'`
- **THEN** "Willekeurig geheim genereren" stands beside "Opslaan"
