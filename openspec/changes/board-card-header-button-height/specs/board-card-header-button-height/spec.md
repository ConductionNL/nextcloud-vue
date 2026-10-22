# board-card-header-button-height Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-card-header-button-height](../../)

## Purpose

Card header buttons are as tall as the boards draw them.

## ADDED Requirements

### Requirement: A labelled card header button is 40px

In the board look a labelled button in a widget card's header actions SHALL draw at the board control height (40px).
Menu triggers and icon-only buttons SHALL keep their size.

#### Scenario: DqZaakTaken

- **GIVEN** the case's Taken tab in the board look
- **THEN** "Nieuwe taak" beside the card title draws 40px tall
