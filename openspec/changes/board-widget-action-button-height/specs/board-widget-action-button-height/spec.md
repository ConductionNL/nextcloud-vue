# board-widget-action-button-height Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-widget-action-button-height](../../)

## Purpose

A widget's own action buttons are as tall as the boards draw them.

## ADDED Requirements

### Requirement: A widget's labelled action button is 40px

In the board look the action buttons of the history header, the files bar (labelled ones only), a widget's empty
state and the archiving card head SHALL draw at the board control height (40px).

#### Scenario: DqZaakHistorie

- **GIVEN** the case's Historie tab in the board look
- **THEN** "Exporteren" draws 40px tall
