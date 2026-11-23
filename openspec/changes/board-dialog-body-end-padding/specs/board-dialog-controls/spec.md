# board-dialog-controls Delta: board-dialog-body-end-padding

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dialog-body-end-padding](../../)

## Purpose

A board dialog's body keeps the same inset on both sides.

## ADDED Requirements

### Requirement: A board dialog's body is inset 24px at both edges

A board dialog's body SHALL be inset 24px at its start and its end edge, whatever order NcDialog's own styles load in.

#### Scenario: DqInstellen

- **WHEN** an administrator opens the setup wizard in the board look
- **THEN** the wizard content is 672px wide in the 720px dialog
