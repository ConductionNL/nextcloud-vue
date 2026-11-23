# cn-data-table Delta: index-table-filter-chips-once

## ADDED Requirements

### Requirement: A host that lists the active filters itself turns the table chips off

CnDataTable SHALL draw its active header filters as chips unless `filterChips` is false. CnIndexPage SHALL pass `filterChips: false` in the board look, whose Active line lists the same filters. The header's filter button SHALL keep its active mark either way.

#### Scenario: Contracts in the board look
- GIVEN the contracts index filtered on status from its defaults
- WHEN the board look renders it
- THEN the Active line shows the status chip and the table card shows none
