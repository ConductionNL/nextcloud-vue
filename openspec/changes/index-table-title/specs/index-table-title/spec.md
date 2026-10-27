# index-table-title

## ADDED Requirements

### Requirement: The table card can carry a title

With `tableTitle`, the index table view MUST draw that title, translated, at the top of the table card. Under the board look the head row of a titled table MUST read on the card's background with a 1px rule under it.

#### Scenario: the walk-in queue

- GIVEN the walk-in queue page with `tableTitle` "In the queue"
- WHEN it opens in Dutch
- THEN the table card starts with "In de wachtrij"
