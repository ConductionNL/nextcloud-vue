# features-board-segmented-filter-row Delta

## ADDED Requirements

### Requirement: The segmented status filter spans the content row

The features board SHALL draw its segmented status filter as a track as wide as the content, with the options at its
start.

#### Scenario: dossiq's roadmap page

- **GIVEN** a roadmap page with `board.filter: "segmented"`
- **THEN** the grey track runs from the left edge of the groups to their right edge
