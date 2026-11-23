# record-list Delta: record-list-board-chevron-and-text-badges

## ADDED Requirements

### Requirement: A board dashboard list can keep its row chevron

A record list with `chevron: true` SHALL carry the class `cn-record-list--chevron`, and the board look SHALL hide a dashboard list's row chevron only on lists without that class.

#### Scenario: My work
- GIVEN a board dashboard list of linked rows with `chevron: true`
- THEN every row ends with the chevron

### Requirement: A badge can read as words in its tone

A field badge with `look: "text"` SHALL draw its label as text in its variant's ink (default muted at 500, error at 700) with no ground; without the key it stays a pill.

#### Scenario: Priority beside the kind pill
- GIVEN a row with priority high and a priority badge with `look: "text"`
- THEN the row shows the kind pill and "High priority" as red words without a pill
