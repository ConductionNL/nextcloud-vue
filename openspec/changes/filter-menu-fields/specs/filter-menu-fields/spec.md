# filter-menu-fields Delta

## ADDED Requirements

### Requirement: A filter menu entry needs no column

CnIndexPage SHALL accept `filterMenuFields`, a list of `{ key, label?, values?, referenceType? }`, and SHALL add each
entry to the Filter menu after the column entries, unless a column already offers that key. Its values SHALL be the
entry's own, else the schema's enum or options, else the API's facet buckets for the key, else the named source's
`facets()` for the key; an entry without values SHALL be left out. Every Filter menu value SHALL read as the Active
chip names it, and a user field SHALL read by the user's display name.

#### Scenario: PqContracten owner

- **GIVEN** `filterMenuFields: [{ "key": "ownerId", "label": "Owner", "referenceType": "nextcloud-user" }]` and facet buckets for `ownerId`
- **THEN** the Filter menu lists "Owner" with "Pieter Jansen", not "pieter.jansen"

### Requirement: The flows source filters on its owner

The `flows` named source SHALL take an `owner` argument, SHALL show only the flows of the chosen owners within the
active tab, and SHALL count its owners in `facets()`.

#### Scenario: PqFlows owner

- **GIVEN** a flows page with `filterMenuFields: [{ "key": "owner", "referenceType": "nextcloud-user" }]`
- **WHEN** the reader ticks one owner
- **THEN** only that owner's flows remain
