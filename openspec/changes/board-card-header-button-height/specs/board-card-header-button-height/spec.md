# board-card-header-button-height Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-card-header-button-height](../../)

## Purpose

Card header buttons are as tall as the boards draw them.

## ADDED Requirements

### Requirement: A labelled card header button is 34px

In the board look a labelled button in a widget card's header actions SHALL draw 34px tall, as the boards draw a card's title-row buttons.
Menu triggers and icon-only buttons SHALL keep their size.

#### Scenario: DqZaaktype

- **GIVEN** the case type page in the board look
- **THEN** "Taak toevoegen" and "Bewerken" beside the card titles draw 34px tall
