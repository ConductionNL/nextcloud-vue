# board-settings-save-row Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-settings-save-row](../../)

## Purpose

A settings card's save row reads as the Dq boards draw it.

## ADDED Requirements

### Requirement: A board settings save row has no divider above it

In the board look a settings section's save row SHALL sit at the bottom end of the card with no border above it.

#### Scenario: DqBeheerinstellingen "Serviceaccount voor achtergrondtaken"

- **GIVEN** the system tab of dossiq's admin settings in the board look
- **THEN** "Dit account gebruiken" sits under the fields with no hairline between them
