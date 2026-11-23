# record-list-empty-text-none Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A record list can say nothing when it is empty

A record list whose `content.emptyText` is the empty string SHALL draw no empty line when it has no rows. Without
`emptyText` it SHALL keep the default empty line.

#### Scenario: DqTermijnen quarterly summary

- **GIVEN** the summary list declares `emptyText: ""`
- **WHEN** the quarter has no decided terms
- **THEN** nothing is drawn under the quarterly table
