# record-list-badges Delta: screens-record-list-badges

## ADDED Requirements

### Requirement: A record-list row can carry badges

`CnRecordListWidget` SHALL draw each entry of `content.badges` that applies to
a row as a small status badge after the row's pill. A field badge SHALL show the
row's value (through `labels`, toned by `colorMap`) unless the value is listed in
`hideValues`. A badge with `kind: "stale"` SHALL show when the row's date field is
more than `afterDays` whole days old, with `{days}` in its label replaced by the
age. `pill.hideValues` SHALL hide the pill for the listed values. A list without
`badges` SHALL render as before.

#### Scenario: The priority badge shows for non-default values only

- **GIVEN** `badges: [{ field: "priority", labels: { urgent: "Urgent" }, colorMap: { urgent: "error" }, hideValues: ["normal"] }]`
- **WHEN** a ticket with priority urgent and one with priority normal render
- **THEN** the first row carries a red "Urgent" badge and the second row none
- @e2e e2e/record-list-badges.e2e.js

#### Scenario: The age badge

- **GIVEN** `{ kind: "stale", field: "updatedAt", afterDays: 7, label: "Stale {days} days" }`
- **WHEN** a row was updated 10 days ago and another yesterday
- **THEN** the first reads "Stale 10 days" and the second has no age badge
- @e2e e2e/record-list-badges.e2e.js
