## ADDED Requirements

### Requirement: Choice rows side by side are as high as the tallest

With `layout="rows"` and more than one column, an option row without details SHALL fill its grid cell, so rows on one line are as high as the tallest of them. A row with details SHALL keep its own height.

#### Scenario: two options side by side
- GIVEN CnChoiceCards with `layout="rows"`, `columns` 2 and two options, one with a two-line description
- WHEN it renders
- THEN both rows are as high as the two-line one
