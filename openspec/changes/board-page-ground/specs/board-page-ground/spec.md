# board-page-ground Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-page-ground](../../)

## Purpose

The content area's ground shows behind a board page's cards.

## ADDED Requirements

### Requirement: A board page draws no ground of its own

In the board look the root of an index, detail, dashboard, settings, store or admin settings page SHALL draw a
transparent background that outranks a theme rule carrying an id, so the content area's ground (the theme's content
surface) shows behind the page's cards.

#### Scenario: DqTeamwachtrij

- **GIVEN** dossiq's queue page in the board look, an index page with a side panel, under the nldesign theme
- **THEN** the area around the cards shows the content area's light grey ground
- **AND** the cards stay white
