# board-dashboard-row-pill-ink Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-row-pill-ink](../../)

## Purpose

A pill in a dashboard row says its tone in its ink as well as its ground.

## ADDED Requirements

### Requirement: A dashboard row's pill keeps its tone

In the board look a status pill and a due text inside a dashboard record-list row SHALL keep their own ink; the row's
other text SHALL take the row's ink.

#### Scenario: Knelpunt

- **GIVEN** "Waar zaken blijven hangen" with an error pill "Knelpunt" on Zuiddrecht
- **THEN** "Knelpunt" reads in #A30000 on its red ground
