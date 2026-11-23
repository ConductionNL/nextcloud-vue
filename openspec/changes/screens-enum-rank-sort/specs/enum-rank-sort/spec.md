# enum-rank-sort Delta: screens-enum-rank-sort

## ADDED Requirements

### Requirement: A record list can sort by the rank of an enum value

A record list whose effective sort (its own `sort`, or the entry its page sort control picks)
carries `rank`, a list of values of `field` in the wanted order, SHALL show the rows in that
order: all rows with the first value, then the second, and so on, each group in the order of
`then` (`{ field, dir }`), followed by the rows whose value is not in `rank` or is empty. The
list SHALL read the groups from the list endpoint until `limit` rows are in, so the rows shown
are the first `limit` rows of the whole filtered set, and SHALL report the total of the whole
set. A sort without `rank` SHALL fetch as before, in one request. A list whose filter already
fixes `field` SHALL ignore `rank`. The object table SHALL ignore a sort entry with `rank`.

#### Scenario: Priority first

- **GIVEN** `sort: { field: "priority", rank: ["urgent", "high", "normal", "low"], then: { field: "slaDeadline", dir: "asc" } }` and `limit: 3`
- **WHEN** the register holds one low, two urgent, one high and one normal ticket
- **THEN** the list shows the two urgent tickets by deadline, then the high one
- @e2e e2e/enum-rank-sort.e2e.js

#### Scenario: Values outside the rank come last

- **GIVEN** the same sort and a limit above the number of rows
- **WHEN** one ticket has no priority
- **THEN** it is the last row, and no row shows twice
- @e2e e2e/enum-rank-sort.e2e.js
