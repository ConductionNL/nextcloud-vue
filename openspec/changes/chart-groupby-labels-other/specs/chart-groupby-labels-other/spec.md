# chart-groupby-labels-other Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A grouped chart can name raw values and fold the rest

`dataSource.groupBy.labels` SHALL map a raw grouped value to its words, translated through the app catalogue; a value
without an entry keeps its key. With `limit` and `otherBucket: true` the groups past the limit SHALL be one "Other"
slice carrying their sum.

#### Scenario: pipelinq's requests by category

- **GIVEN** `groupBy: { field: 'category', limit: 3, otherBucket: true, labels: { afval: 'Waste' } }`
- **THEN** the donut shows the three largest categories by name and "Overig" with the rest
