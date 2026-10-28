# index-expandable-rows

## ADDED Requirements

### Requirement: An index row can open to a sub-table

With `expandableRows`, the index list view MUST draw each object as a row that shows, closed, its title, an optional badge, its description, a list field as chips with separators, and a meta line; and, open, that list as a table with the configured columns, a note and a footer action.

#### Scenario: the stages of a pipeline

- GIVEN a pipeline "Verkoop" with six stages, the first marked default and "Gewonnen" won
- WHEN the pipelines list opens with `open: first`
- THEN the "Verkoop" row is open and shows a table row per stage with its order, name, chance bar, start mark, closed and result pill
- AND the other rows are closed and show their stages as chips, a won stage green and a lost stage red

### Requirement: A row button runs a row action

A header button or the footer action MUST name a row action by its id and run it as the row's menu would.

#### Scenario: edit a pipeline

- GIVEN the row action `edit`
- WHEN the user chooses Edit on a row
- THEN the edit runs for that row and `action` is emitted with its id
