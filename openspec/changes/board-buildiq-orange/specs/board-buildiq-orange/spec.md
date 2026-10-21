# board-buildiq-orange Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-buildiq-orange](../../)

## Purpose

The buildiq square is drawn in the boards' orange in the board look.

## ADDED Requirements

### Requirement: The board buildiq square is the boards' orange

In the board look the buildiq edit square SHALL be filled with #e2611a, with its white icon at 3.52:1. In the Nextcloud look it SHALL keep the brand orange.

#### Scenario: PtPortals
- **GIVEN** an app with `look: "board"`
- **WHEN** the Portals index page renders its header
- **THEN** the buildiq square's background is rgb(226, 97, 26)

#### Scenario: The Nextcloud look
- **GIVEN** an app without the board look
- **THEN** the buildiq square keeps `var(--c-orange-knvb, #f36c21)`
