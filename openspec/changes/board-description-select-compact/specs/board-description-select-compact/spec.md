# board-description-select-compact Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A description select is as wide as its choice

In the board look, a select on a dashboard description line SHALL have no minimum width of its own beyond its choice,
so the line's controls stay on one line where the board draws them on one.

#### Scenario: DqProcesanalyse

- **GIVEN** the description, Gemiddeld/Mediaan, "Laatste 12 maanden" and "Alle zaaktypen" on a 1120px header
- **THEN** all four sit on one line
