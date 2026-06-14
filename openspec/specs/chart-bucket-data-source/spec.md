# chart-bucket-data-source Specification

## Purpose
TBD - created by archiving change add-dashboard-date-range-and-chart-bucket. Update Purpose after archive.
## Requirements
### Requirement: `useDataSource` SHALL accept a `bucket` shorthand that emits OR's `groupBy` GraphQL argument

`useDataSource` SHALL recognise a `bucket` block on the manifest
`dataSource` object alongside the existing `aggregate: 'count'` and
`graphql:` shorthands. The composable SHALL emit a query of the form:

```graphql
query($from: String!, $to: String!) {
  <schemaSlug>(filter: <filter or omitted>,
               groupBy: { field: "<field>", interval: <INTERVAL>,
                          from: $from, to: $to,
                          metric: <METRIC>,
                          metricField: "<metricField>" })
  {
    groups { key value }
  }
}
```

The `interval` SHALL map case-insensitively to the GraphQL
`TimeInterval` enum: `MINUTE | HOUR | DAY | WEEK | MONTH | QUARTER |
YEAR`. The `metric` SHALL map to `AggregationMetric`: `COUNT | SUM |
AVG | MIN | MAX`. `metric` SHALL default to `count` (omitted from the
emitted GraphQL since the server defaults to `COUNT`); `metricField`
SHALL only appear in the emitted GraphQL when the metric is non-count.

The default selectors SHALL be:

```js
{ series:     '<schemaSlug>.groups[].value',
  categories: '<schemaSlug>.groups[].key' }
```

#### Scenario: Day-bucketed call_log error counts
- **GIVEN** `dataSource:
  { schema: 'call_log',
    filter: { status: 'error' },
    bucket: { field: 'created', interval: 'day',
              fromVar: 'from', toVar: 'to',
              staticRange: { from: '2026-05-01T00:00:00.000Z',
                             to:   '2026-05-22T00:00:00.000Z' } } }`
- **WHEN** `useDataSource` runs
- **THEN** the emitted query SHALL contain
  `groupBy: {field: "created", interval: DAY, from: $from, to: $to}`
- **AND** the GraphQL variables SHALL be
  `{ from: '2026-05-01T00:00:00.000Z',
     to:   '2026-05-22T00:00:00.000Z' }`
- **AND** when the server returns
  `{ call_log: { groups: [{key:"2026-05-01T00:00:00Z", value:3},
                          {key:"2026-05-02T00:00:00Z", value:1}] } }`
  the resolved `data.value` SHALL be
  `{ series: [3, 1],
     categories: ['2026-05-01T00:00:00Z', '2026-05-02T00:00:00Z'] }`

#### Scenario: SUM metric requires metricField
- **GIVEN** `bucket: { field: 'created', interval: 'day',
                       metric: 'sum' }` with no `metricField`
- **WHEN** `useDataSource` runs
- **THEN** `error.value` SHALL be a non-null `Error`
- **AND** the message SHALL mention `metricField is required for
  non-count metrics`
- **AND** no GraphQL request SHALL be issued

#### Scenario: Interval is case-insensitive
- **GIVEN** `bucket.interval` of `'DAY'`, `'day'`, or `'Day'`
- **WHEN** `useDataSource` builds the query
- **THEN** the emitted GraphQL SHALL contain `interval: DAY`

#### Scenario: Unknown interval is rejected client-side
- **GIVEN** `bucket.interval: 'fortnight'`
- **WHEN** `useDataSource` runs
- **THEN** `error.value` SHALL be a non-null `Error`
- **AND** no request SHALL be issued

### Requirement: CnChartWidget SHALL inject `cnDashboardDateRange` and pipe it into the bucket variables

When `dataSource.bucket` is set on a `CnChartWidget`, the widget SHALL
read the injected `cnDashboardDateRange` ref and use its
`{from, to}` as the GraphQL variables named by `bucket.fromVar` /
`bucket.toVar`. If the inject's value is `null`, the widget SHALL fall
back to `bucket.staticRange`. If both are unavailable, the widget
SHALL NOT issue a query (`useDataSource` returns null query → null
data) and SHALL render its fallback / unavailable state instead.

Updates to the injected ref SHALL re-fire the GraphQL query (the
variables ref is reactive and `useGraphQL` watches it deeply).

#### Scenario: Inject overrides staticRange
- **GIVEN** a `CnChartWidget` mounted under a dashboard whose
  `cnDashboardDateRange.value` is
  `{ from: '2026-05-15T00:00:00.000Z',
     to:   '2026-05-21T23:59:59.999Z',
     preset: 'last-7' }`
- **AND** the widget's `dataSource.bucket.staticRange` is
  `{ from: '2026-01-01T00:00:00.000Z',
     to:   '2026-12-31T23:59:59.999Z' }`
- **WHEN** the widget mounts
- **THEN** the GraphQL variables sent SHALL be the inject values,
  not the staticRange values

#### Scenario: No range available → no query
- **GIVEN** a `CnChartWidget` mounted outside a dashboard (no inject)
- **AND** `dataSource.bucket.staticRange` is `null`
- **WHEN** the widget mounts
- **THEN** no HTTP request SHALL be issued
- **AND** the chart SHALL render its fallback / unavailable state

#### Scenario: Date-range change re-fires the query
- **GIVEN** a mounted widget whose inject is on `last-7`
- **WHEN** the user picks `last-30` (the injected ref's value
  updates)
- **THEN** `useGraphQL` SHALL re-issue the query with the new
  `from` / `to` variables

### Requirement: `selectByPath` SHALL flat-map array hops via `[]` segments

`selectByPath` SHALL treat a `[]` suffix on a path segment as a
flat-map: each cursor value's child at the trailing key SHALL be
spread into the next cursor list. The selector
`<root>.groups[].value` SHALL resolve to an array of bucket values
in document order.

#### Scenario: Two-bucket flat-map
- **GIVEN** the input
  `{ call_log: { groups: [{key:'a', value: 1}, {key:'b', value: 2}] } }`
- **WHEN** `selectByPath(input, 'call_log.groups[].value')` is called
- **THEN** the result SHALL be `[1, 2]`
- **AND** `selectByPath(input, 'call_log.groups[].key')` SHALL be
  `['a', 'b']`

#### Scenario: Empty array flat-map returns `[]`
- **GIVEN** the input `{ call_log: { groups: [] } }`
- **WHEN** `selectByPath(input, 'call_log.groups[].value')` is called
- **THEN** the result SHALL be `[]` (NOT `undefined`)

