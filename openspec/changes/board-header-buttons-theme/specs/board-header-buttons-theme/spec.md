# board-header-buttons-theme Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-header-buttons-theme](../../)

## Purpose

A page's header buttons look as the boards draw them, also under a theme that styles buttons with `!important`.

## ADDED Requirements

### Requirement: Board header buttons keep the board's weight and ground under a theme

In the board look, the header buttons of an index, detail, dashboard, settings or admin settings page, and the
buttons of CnActionButtons, SHALL set the nldesign button tokens so that every button draws at weight 600, and a
secondary button draws the main text on the main background with a `--color-border-dark` border and the hover ground
on hover.

#### Scenario: Dashboard header under the nldesign theme

- **GIVEN** dossiq's Mijn werk in the board look under the nldesign theme
- **AND** a header action "Nieuwe zaak" with no variant
- **THEN** the button draws the main text at weight 600 on the main background with a grey border

#### Scenario: Index header primary button

- **GIVEN** an index page in the board look under the nldesign theme
- **THEN** its primary "Nieuwe zaak" button draws at weight 600
