# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-actions-per-tab](../../)

## ADDED Requirements

### Requirement: Quick actions and the next step card can follow the open tab

A quick action written `{ id, tabs?, notTabs? }` SHALL show as a button only while the open body tab passes the same
rule as a side card: with `tabs`, one of them is open; with `notTabs`, none of them is open. On another tab the action
SHALL be listed in the Actions menu. `nextStep` with `tabs` or `notTabs` SHALL render its card only on a tab that
passes that rule. A page that names no tabs SHALL render as before.

#### Scenario: DqZaakAssistent

- **GIVEN** the case page declares `nextStep.notTabs: ["ai-oversight"]` and quick actions "Document" and "Contact"
  with `notTabs: ["ai-oversight"]`
- **WHEN** the handler opens AI-toezicht
- **THEN** the "what now" card is gone and the only quick action is "Bericht"
