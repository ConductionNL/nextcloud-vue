# board-settings-section-buttons Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-settings-section-buttons](../../)

## Purpose

Buttons on a settings card are as large as the boards draw them.

## ADDED Requirements

### Requirement: A labelled button on a board settings card is 40px

In the board look a labelled button on an admin settings card SHALL be 40px tall, and a text-only one SHALL be padded
16px at both sides.

#### Scenario: PtBeheerinstellingen

- **GIVEN** portaliq's admin settings in the board look
- **THEN** "Adres opslaan" is 40px tall, its label 16px in
