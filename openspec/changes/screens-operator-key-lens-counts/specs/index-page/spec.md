# index-page Delta: screens-operator-key-lens-counts

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-operator-key-lens-counts](../../)

## Purpose

A quick-filter lens counts what the list beside it shows, also when the lens spells its operator in the key.

## ADDED Requirements

### Requirement: A lens with an operator in a key is counted through the list endpoint

When a quick filter or saved view that shows a count has a filter key ending in an operator (`field[op]`), or the
page's base filter has one, its count SHALL be the `total` of a list request with that filter, sent as the page's own
list request sends it. It SHALL NOT be counted through an aggregation endpoint. Other entries SHALL keep their grouped
or value request.

#### Scenario: Upcoming meetings

- **GIVEN** an index page with quick filters "Komende" `{ "scheduledDate[gte]": "@today" }` and "Afgerond" `{ lifecycle: "closed" }`, both with `showCount`
- **WHEN** the counts load and five meetings are scheduled from today
- **THEN** "Komende" shows 5, counted by a list request with `scheduledDate[gte]` set to today's resolved date and `_limit=1`
- **AND** "Afgerond" is still counted by the aggregation endpoint
