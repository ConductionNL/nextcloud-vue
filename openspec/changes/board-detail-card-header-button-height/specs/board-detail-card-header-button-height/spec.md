# board-detail-card-header-button-height Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-detail-card-header-button-height](../../)

## Purpose

A detail card's header buttons are as tall as the boards draw them.

## ADDED Requirements

### Requirement: A labelled detail card header button is 40px

In the board look a labelled button beside a CnDetailCard's title SHALL draw at the board control height (40px).
Menu triggers and icon-only buttons SHALL keep their size.

#### Scenario: DqTaak

- **GIVEN** the task's notes card with its add form behind a button
- **THEN** "Notitie toevoegen" beside the card title draws 40px tall
