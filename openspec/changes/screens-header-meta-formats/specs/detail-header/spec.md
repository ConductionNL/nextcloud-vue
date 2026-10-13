# detail-header Delta: screens-header-meta-formats

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-header-meta-formats](../../)

## Purpose

The detail header's meta line can say when, not only what.

## ADDED Requirements

### Requirement: The header meta line formats date tokens

A `{path|format}` token in `headerMeta` SHALL be written with the format a record-list row template uses (`date`,
`datetime`, `relative`, `relativetime`, `days`). A token without a format SHALL be written as before, and a token
without a value SHALL drop the whole line.

#### Scenario: Days open

- **GIVEN** `headerMeta` is "via {channel} · {createdAt|days} dagen open" and the record was created six days ago
- **WHEN** the header renders
- **THEN** the meta line reads "via Mijn Zuiddrecht · 6 dagen open"
