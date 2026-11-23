# board-text-description-ends-8px Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-text-description-ends-8px](../../)

## Purpose

A board dashboard header with a line of text under the title is as tall as the boards draw it.

## ADDED Requirements

### Requirement: A text description ends the board header 8px under it

In the board look, a `CnDashboardPage` description that holds no select and no segmented control SHALL be set at the
font's normal line height and pad 8px under it. A description holding filter controls keeps its own height.

#### Scenario: DqMijnTeam

- **GIVEN** the team view in the board look with its greeting line under the title
- **THEN** the header is 76px tall and the view switch starts 20px under it
