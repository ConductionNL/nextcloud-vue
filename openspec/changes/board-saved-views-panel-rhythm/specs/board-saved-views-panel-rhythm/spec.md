# board-saved-views-panel-rhythm

## ADDED Requirements

### Requirement: The saved-views panel keeps the board's rhythm (REQ-BSVPR-001)
In the board look the saved-views panel SHALL start 2px lower than its container's padding, put 6px between its parts, 8px between Save view and its note, draw the note at the normal line height, put 16px above a group heading (22px with the gap) whose row is 22px tall, and 2px between the rows of a group.

#### Scenario: DqFilterBeheren's own views
- **GIVEN** the cases index in the board look with the Views tab open
- **WHEN** the panel is drawn
- **THEN** "Mijn weergaven" SHALL sit 22px under the note and its first three rows 52px apart, as DqFilterBeheren draws them
- @e2e exclude {layout is measured by the screens compdiff run, not by a Playwright scenario}
