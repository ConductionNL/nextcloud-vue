# stats-block Delta: screens-stats-block-operator-keys

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-stats-block-operator-keys](../../)

## Purpose

A stats block counts the same rows whether its filter spells the operator in the key or nests it.

## ADDED Requirements

### Requirement: A stats-block filter can spell its operator in the key

A filter key of the form `field[op]` SHALL be sent to the aggregation endpoint as `filter[field][op]`, the same
parameter a nested `{ field: { op } }` filter sends. Any other key SHALL be sent as `filter[key]`.

#### Scenario: Meetings this year

- **GIVEN** an entry with `filter: { "meetingDate[gte]": "2026-01-01" }`
- **WHEN** the block fetches its count
- **THEN** the request carries `filter[meetingDate][gte]=2026-01-01`, and no `filter[meetingDate[gte]]`
