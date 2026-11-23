# board-index-toolbar-controls Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-index-toolbar-controls](../../)

## Purpose

The search field and the Filter button of an index page's board toolbar draw the board's size and edge under
Nextcloud's and a theme's own rules.

## ADDED Requirements

### Requirement: The search field is 40px under Nextcloud's input rule

In the board look the index toolbar's search field SHALL be 40px high, also where Nextcloud's input rule sets inputs
to the clickable area.

#### Scenario: DqContacten search

- **GIVEN** an index page in the board look on a Nextcloud whose clickable area is 34px
- **THEN** "Zoek op naam, BSN of woonplaats" is 40px high

### Requirement: The Filter button draws the control border

In the board look the toolbar's Filter button and Filter menu button SHALL draw a 1px border in
`--cn-board-control-border`, whatever a theme sets as the secondary button's border.

#### Scenario: DqContacten Filter

- **GIVEN** an index page in the board look under a theme that sets the light primary hover near white
- **THEN** "Filter" has a 1px border in the board control border colour, as "Downloaden" has
