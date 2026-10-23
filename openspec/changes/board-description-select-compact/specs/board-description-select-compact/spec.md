# board-description-select-compact Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A description select is as wide as its choice

In the board look, a select on a dashboard description line SHALL be 190px wide, without NcSelect's 260px minimum, and its choice SHALL run up to the chevron while no clear
button shows, so the line's controls stay on one line where the board draws them on one.

#### Scenario: DqProcesanalyse

- **GIVEN** the description, Gemiddeld/Mediaan, "Laatste 12 maanden" and "Alle zaaktypen" on a 1120px header
- **THEN** all four sit on one line
