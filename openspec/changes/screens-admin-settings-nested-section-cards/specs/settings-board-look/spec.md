# settings-board-look Delta: screens-admin-settings-nested-section-cards

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-admin-settings-nested-section-cards](../../)

## Purpose

An app's settings component may wrap its sections in one element and still get the board's cards.

## ADDED Requirements

### Requirement: Sections inside a wrapping element are cards

Under the board look, a direct child of CnAdminSettingsShell whose own children are settings sections SHALL take no
box, and those sections SHALL be grid items drawn as cards, as the shell's direct sections are. A direct child that
holds no sections SHALL keep spanning the grid.

#### Scenario: Decidiq settings component

- **GIVEN** a shell with `look: "board"` whose default slot is one element holding the sections Organisatie and Register
- **WHEN** the page renders
- **THEN** Organisatie and Register are cards with a border and the page background, side by side in the grid
