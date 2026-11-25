# library-stylesheet Delta: board-look-sheet-on-demand

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-look-sheet-on-demand](../../)

## Purpose

A page that never draws the board look does not pay for the board look's rules.

## ADDED Requirements

### Requirement: The board-look rules are active only where the board look is used

The published ESM entry SHALL install the board-look rules as their own stylesheet, directly after the library
stylesheet, that takes no part in style matching until a component on the page resolves the board look. A component
that resolves the board look SHALL switch those rules on before its first render. A board-look stylesheet installed
after that SHALL be active at once. The published `nextcloud-vue.css` files and `css/index.css` SHALL keep every rule.

#### Scenario: An app in the default look

- **GIVEN** a page whose apps all draw the Nextcloud look
- **WHEN** the library stylesheet is installed
- **THEN** the board-look stylesheet is on the page with `media="not all"`

#### Scenario: An app in the board look

- **GIVEN** an app whose manifest sets `look: "board"`
- **WHEN** CnAppRoot renders for the first time
- **THEN** the board-look stylesheet has no `media` attribute and `<html>` carries `data-cn-board-look`

#### Scenario: A newer build after the board look is in use

- **GIVEN** a page where the board look is in use
- **WHEN** a newer library build installs its board-look stylesheet
- **THEN** that stylesheet replaces the old one in place and is active
