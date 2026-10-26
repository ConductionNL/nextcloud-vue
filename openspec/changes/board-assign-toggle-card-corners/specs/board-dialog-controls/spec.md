# board-dialog-controls Delta: board-assign-toggle-card-corners

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-assign-toggle-card-corners](../../)

## Purpose

A board dialog's checkbox choice card has the board's corners and label line.

## ADDED Requirements

### Requirement: A board dialog's checkbox choice card has 8px corners and an 18px label line

In a board dialog, a CnAssignDialog toggle card SHALL have 8px corners and its label SHALL sit on an 18px line.

#### Scenario: DqOverdragen

- **WHEN** a handler opens Zaak aan een ander team geven
- **THEN** the "Verzoeker informeren" card has 8px corners and its label starts 13px from the card's top
