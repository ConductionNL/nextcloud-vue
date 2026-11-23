# board-stat-tile-content-from-top Delta: kpi-card

## ADDED Requirements

### Requirement: A board stat tile holds its content at the top

Under the board look, a stacked board stat tile on a dashboard SHALL place its
content from its top inset, also when its grid row makes it taller than its
content.

#### Scenario: A tile without a caption beside one with a caption

- **GIVEN** four stacked board tiles in a `sameHeight` row, one with a caption
- **WHEN** the row renders
- **THEN** every tile's label sits on the same top inset
