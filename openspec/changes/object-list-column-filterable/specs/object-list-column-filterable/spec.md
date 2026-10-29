## ADDED Requirements

### Requirement: an object list column passes its filter settings to the table

CnObjectListWidget MUST pass a manifest column's `filterable` and `filterField` to CnDataTable, so a column with `filterable: false` draws no head filter in a filterable list.

#### Scenario: DqZaaktypeVelden "In de lijst"
- GIVEN the fields table with `filterable: true` and its "In the list" column with `filterable: false`
- THEN that column's head shows no filter button, and the other heads keep theirs
