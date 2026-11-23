# aggregate-merge-by-label Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [aggregate-merge-by-label](../../)

## Purpose

A chart can count by what a group is called rather than by the id it is stored under.

## ADDED Requirements

### Requirement: An aggregate can merge groups by label

With `aggregate.mergeByLabel: true` CnChartWidget SHALL resolve the label of every group, fold the groups whose labels
are equal into one with their values summed, sort the result by value and only then apply `topN` and `otherBucket`.

#### Scenario: Status types per case type

- **GIVEN** a status aggregate whose keys `uuid-rec-a` (9) and `uuid-rec-b` (5) both resolve to "Received", with `topN: 4`
- **THEN** the chart draws one "Received" bar of 14 in its place by value among the top four

### Requirement: A merged bar drills into all its keys

A bar merged from several keys SHALL navigate with all of them as a list in the drilldown query; a bar with one key
SHALL navigate with that key as a plain value.

#### Scenario: Drilling into Received

- **GIVEN** the merged "Received" bar and `drilldown: { route: "Cases", filterParam: "status" }`
- **THEN** a click opens Cases with `status: ["uuid-rec-a", "uuid-rec-b"]`
