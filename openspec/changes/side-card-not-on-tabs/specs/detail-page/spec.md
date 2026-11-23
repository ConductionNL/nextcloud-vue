# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [side-card-not-on-tabs](../../)

## ADDED Requirements

### Requirement: A side card can stand aside for a tab

A side column entry with `notTabs` SHALL NOT show while one of those body tabs is open, and SHALL show beside every
other tab (subject to `tabs` and `visibleWhen`). Edit mode SHALL show it.

#### Scenario: DqZaakAssistent

- **GIVEN** the generic case side cards declare `notTabs: ["ai-oversight"]`
- **WHEN** the handler opens AI-toezicht
- **THEN** the side column holds only the Assistent card
