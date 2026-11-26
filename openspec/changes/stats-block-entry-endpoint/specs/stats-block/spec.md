# stats-block Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [stats-block-entry-endpoint](../../)

## ADDED Requirements

### Requirement: A stats-block entry can read its value from an endpoint

A stats-block entry with an `endpointSource` SHALL read its value from that endpoint's response, at the source's
`responsePath` and then the entry's `valueField`, instead of OpenRegister's aggregation, and MAY leave out `register`
and `schema`. Entries naming the same endpoint SHALL share one request. A failed or blocked request, or a value that is
not a number, SHALL show the entry without a count. An entry without `endpointSource` SHALL read OpenRegister as before.

#### Scenario: One summary endpoint feeds two KPIs

- **GIVEN** a stats-block with entries "Open" and "Late" whose `endpointSource` is `/apps/x/api/summary` with `responsePath: "totals"`, and `valueField` `open` and `late`
- **WHEN** the endpoint answers `{ "totals": { "open": 4, "late": 2 } }`
- **THEN** "Open" shows 4 and "Late" shows 2, from one request
