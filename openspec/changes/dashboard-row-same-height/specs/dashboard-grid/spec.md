## ADDED Requirements

### Requirement: the cards of a row can share one height

Dashboard placements with `sameHeight: true` and `sizeToContent` that start on the same layout row MUST be drawn at the height of the tallest of them, MUST follow that height when the content grows or shrinks, and MUST keep their own heights in edit mode and on a reflowed (stacked) grid.

#### Scenario: DqProcesanalyse KPI tiles
- GIVEN four KPI tiles on one row, one with a caption
- THEN all four are as tall as the one with the caption, their content at the top

#### Scenario: DqProcesanalyse charts
- GIVEN "Doorlooptijd per status" shorter than "Doorstroom" beside it
- THEN both cards are as tall as Doorstroom
