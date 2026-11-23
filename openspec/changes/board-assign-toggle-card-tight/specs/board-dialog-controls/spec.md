# board-dialog-controls Delta: board-assign-toggle-card-tight

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-assign-toggle-card-tight](../../)

## Purpose

A checkbox choice card in a board dialog is as tight as the board draws it, without a target under 24px.

## ADDED Requirements

### Requirement: A board dialog's checkbox choice card is tight

In a board dialog, a CnAssignDialog toggle card SHALL take 10px 14px padding, a checkbox row of at least 24px with no
block padding, and a note at line height 1.2.

#### Scenario: DqOverdragen

- **WHEN** a handler opens Zaak aan een ander team geven
- **THEN** the "Verzoeker informeren" card is about 79px high with its two-line note
