# user-settings-close-button Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [user-settings-close-button](../../)

## Purpose

The user settings dialog closes from its corner.

## ADDED Requirements

### Requirement: The user settings close button sits in the corner

The close button of the user settings dialog SHALL be placed absolutely, 8px from the top and the end edge, in every
look, and SHALL NOT stretch with the dialog body. In the board look it SHALL be 44px square, round, without an edge.

#### Scenario: DqPersoonlijkeInstellingen

- **GIVEN** the user settings dialog
- **THEN** "Sluiten" is a 44x44 round button 8px from the top and the end edge
