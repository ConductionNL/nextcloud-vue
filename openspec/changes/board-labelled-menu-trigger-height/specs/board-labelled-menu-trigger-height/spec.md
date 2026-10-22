# board-labelled-menu-trigger-height Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-labelled-menu-trigger-height](../../)

## Purpose

Labelled menu buttons are as tall as the header buttons.

## ADDED Requirements

### Requirement: A labelled board menu button is 40px

In the board look a menu button with a label SHALL be 40px tall wherever it stands; an icon-only menu button SHALL keep
its size.

#### Scenario: Case Taken tab

- **GIVEN** the case's Taken tab in the board look
- **THEN** the card's "Acties" and the tab strip's "Acties" are 40px tall
