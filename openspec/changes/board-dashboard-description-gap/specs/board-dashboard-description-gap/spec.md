# board-dashboard-description-gap Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-description-gap](../../)

## Purpose

The board dashboard description is spaced from the title by the header grid's row gap alone.

## ADDED Requirements

### Requirement: The board dashboard description adds no margin of its own above it

In the board look, when the header's title row holds buttons, the dashboard description (with or without its period
group) SHALL have no top margin, so it stands about 13px below the title's text (the 40px title row plus the 6px row
gap). Without buttons the description keeps its 6px margin, which gives the same 13px.

#### Scenario: DqDashboard

- **GIVEN** the dossiq dashboard in the board look
- **THEN** "Goedemorgen ..." stands about 13px below "Dashboard", not 19px
