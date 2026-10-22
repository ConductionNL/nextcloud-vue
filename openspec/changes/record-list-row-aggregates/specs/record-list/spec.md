# record-list Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-row-aggregates](../../)

## Purpose

A record list row can say how much points at it.

## ADDED Requirements

### Requirement: A record list row can carry a figure over its related objects

With `content.aggregates` CnRecordListWidget SHALL ask each declared figure for every row it shows, with `@self.<path>` in
`where` read off that row, the same way a table's `aggregate` column does, and SHALL offer it to the row's templates under
its key. A failed figure SHALL be left out of the row.

#### Scenario: DqZaaktype

- **GIVEN** the versions card with `aggregates.runningCases` counting cases whose `caseType` is the version and that are not final
- **AND** meta `"{validFrom|date} · {runningCases} running cases"`
- **THEN** version 4 reads "2 okt 2026 · 31 lopende zaken"
