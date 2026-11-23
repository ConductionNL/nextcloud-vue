# record-list Delta

## ADDED Requirements

### Requirement: A record list can draw its rows as tiles

A record list with `presentation: "rows"` and `tiles: true` SHALL draw each row as a framed tile (8px 10px inside a
1px hairline edge, radius 8, the title at 14px regular) in a grid of 260px at the least with 8px between tiles. A list
without `tiles` keeps its rows.

#### Scenario: A case type's statuses

- **GIVEN** the Statuses card with `presentation: "rows"`, `tiles: true`, a colour `dot` and `flags`
- **THEN** the statuses read as tiles in two columns, each with its dot, its name and its flag at the end
