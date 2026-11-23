# board-widget-header-action-neutral Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-widget-header-action-neutral](../../)

## Purpose

A widget's card header action looks as designed in every look, and as the boards draw it in the board look.

## ADDED Requirements

### Requirement: A widget header action is styled where it is rendered

The style of a non-primary widget card header action SHALL live in the component that renders it
(CnDetailWidgetHeaderItems), so that its scoped rule applies to the button.

#### Scenario: Plain Nextcloud look

- **GIVEN** a widget that reports a non-primary header action
- **THEN** the action draws as the tinted 32px action, not as Nextcloud's bare button

### Requirement: A board widget header action in the main column is a neutral 40px control

In the board look a non-primary widget card header action outside the side column SHALL draw 40px tall with the
control border, the main background and the main text at 14px/600. The side column SHALL keep the tinted action.

#### Scenario: DqZaakBesluiten

- **GIVEN** the case's Besluiten tab in the board look
- **THEN** "Document genereren" beside the card title draws 40px tall, white, with a 1px grey border
