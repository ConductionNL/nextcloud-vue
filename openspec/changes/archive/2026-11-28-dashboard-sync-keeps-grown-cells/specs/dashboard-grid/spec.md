# dashboard-grid Delta: dashboard-sync-keeps-grown-cells

## ADDED Requirements

### Requirement: A card moved up by the layout stops under the cards above it

When a layout change moves a card the grid already tracks UP (for example the page re-compacting its display layout
after a conditional widget left), CnDashboardGrid SHALL move the cards in row order and SHALL NOT place a card above
the first row under the cards before it in the same columns, as the grid holds them (a size-to-content cell counts
with the height its content gave it). A card moved down, or moved up with nothing in the way, SHALL go where the
layout puts it. These moves SHALL NOT emit `layout-change`.

#### Scenario: the counters stay under a grown greeting

- GIVEN a size-to-content greeting authored 1 row tall that its content grew to 2 rows, and counters on row 3
- WHEN the layout moves the counters to row 1 (a banner between them left)
- THEN the counters move to row 2 and the greeting stays on row 0

#### Scenario: a card moved down keeps the row the layout gives

- GIVEN a card on row 3
- WHEN the layout moves it to row 6
- THEN the card moves to row 6
