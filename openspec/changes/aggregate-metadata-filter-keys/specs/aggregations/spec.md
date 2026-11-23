# aggregations Delta

## ADDED Requirements

### Requirement: An aggregation filter can name a metadata field

An aggregation request SHALL send a filter on `@self[<field>]` or `@self.<field>` as the endpoint's `_<field>` column.

#### Scenario: Not changed in 14 days

- **GIVEN** a count with filter `{ "@self[updated][lt]": "2026-10-14" }`
- **THEN** the request carries `filter[_updated][lt]=2026-10-14`
