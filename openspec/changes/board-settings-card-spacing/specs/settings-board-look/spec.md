# settings-board-look Delta: board-settings-card-spacing

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-settings-card-spacing](../../)

## Purpose

An admin settings card under the board look has the board's spacing: title and description as one group, and no extra margin around a note card.

## ADDED Requirements

### Requirement: A board admin settings card spaces its title and description as the board does

Under the board look an NcSettingsSection that is a card of CnAdminSettingsShell SHALL have 20px 22px padding and a 17px bold title, its description SHALL start 4px under the title, and a note card directly in the card SHALL add no margin of its own, so the card's 14px gap is the only space between its title group and its content.

#### Scenario: Aanmelden op het portaal

- **GIVEN** CnAdminSettingsShell told `look: "board"` holding an NcSettingsSection "Aanmelden op het portaal" with a description and a success note card
- **WHEN** the card renders
- **THEN** the description starts 4px under the title, the note card starts 14px under the description, and the card ends 20px under the note card
