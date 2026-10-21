# board-period-group-soft-ink Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-period-group-soft-ink](../../)

## Purpose

The board look draws a compact segmented control as the boards' period group.

## ADDED Requirements

### Requirement: A board period group draws the options not chosen in the soft ink

In the board look a compact segmented control SHALL pad a labelled option 14px on each side, draw the options not
chosen in the soft ink and the chosen option in the main ink. An icon-only option SHALL keep no side padding.

#### Scenario: DqDoorlooptijd period

- **GIVEN** a board dashboard with a segmented date range Maand / Kwartaal / Jaar and Maand chosen
- **THEN** "Kwartaal" and "Jaar" are soft labels on the track, 14px from their edges
- **AND** "Maand" is raised on white in the main ink
