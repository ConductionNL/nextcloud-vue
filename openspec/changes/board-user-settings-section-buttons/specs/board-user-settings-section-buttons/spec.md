# board-user-settings-section-buttons Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-user-settings-section-buttons](../../)

## Purpose

The user settings dialog's buttons are drawn as the board draws them.

## ADDED Requirements

### Requirement: A user settings section button is a 40px text button

In the board look a labelled button in a section of the user settings dialog SHALL draw at the board control height
(40px), 16px in, without its icon.

#### Scenario: DqPersoonlijkeInstellingen

- **GIVEN** the user settings dialog in the board look
- **THEN** "Waarneming registreren" draws 40px tall, text only
