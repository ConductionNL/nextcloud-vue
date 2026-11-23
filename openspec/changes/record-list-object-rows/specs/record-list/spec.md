## ADDED Requirements

### Requirement: A record list can list rows the page record holds

A record list with `objectRows: { path, where?, valuePath? }` SHALL list the
rows the page record holds there: the list at `path`, narrowed to its entry
matching every key of `where`, that entry's `valuePath`, a JSON string decoded.
It SHALL send no request for them, and anything that is not a list of objects
SHALL be no rows.

#### Scenario: the investigation steps of a case
- GIVEN a case whose `sensitiveProperties` holds `{ name: "onderzoeksstappen", value: "[{\"kind\":\"gesprek\"},{\"kind\":\"informatie-opgevraagd\"}]" }`
- WHEN a record list declares `objectRows: { path: "sensitiveProperties", where: { name: "onderzoeksstappen" }, valuePath: "value" }`
- THEN it lists two rows
- AND for a reader the case came without `sensitiveProperties`, it lists none

### Requirement: A tab can count the rows its record holds

A tab with `countObjectRows` SHALL show the number of rows that declaration
names on the page record.
