# user-settings-board-dialog Delta: user-settings-one-section

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [user-settings-one-section](../../)

## Purpose

Show one settings section at a time, as the board does.

## ADDED Requirements

### Requirement: The board user settings dialog shows one section at a time

The board user settings dialog SHALL show only the section of the current navigation entry and keep the other
sections mounted but hidden. Picking another entry SHALL show its section, move focus to that section's heading and
mark the entry `aria-current="true"`. What a reader typed in a hidden section SHALL still be there when it is shown
again.

#### Scenario: Switch to Notifications

- **GIVEN** the sections "Case types in my menu" and "Notifications", the first shown, with text typed in it
- **WHEN** the reader picks "Notifications"
- **THEN** only Notifications shows, focus is on its heading, its entry is current, and the typed text is still in the first section
