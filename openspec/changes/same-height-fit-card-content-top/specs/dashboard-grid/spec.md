# same-height-fit-card-content-top Delta: dashboard-grid

## ADDED Requirements

### Requirement: A stretched fitted card keeps its content at the top

A card in a `sameHeight` row that the row makes taller than its content SHALL
keep its content at the top, also when the dashboard page fits it to its
content (a stat tile).

#### Scenario: Four stat tiles, one with a caption

- **GIVEN** four stacked stat tiles in a `sameHeight` row, one with a caption
- **WHEN** the row renders
- **THEN** every tile's label sits on the same top inset
