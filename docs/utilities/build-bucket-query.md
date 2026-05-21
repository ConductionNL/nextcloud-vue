# buildBucketQuery

Builds the time-bucketed `groupBy` GraphQL query used by `useDataSource`'s `bucket` shorthand. Mirrors the OpenRegister `GroupByInput` contract from `openregister/openspec/changes/add-time-bucket-aggregation/specs/graphql-api/spec.md`.

```js
import { buildBucketQuery } from '@conduction/nextcloud-vue'

buildBucketQuery({
  schemaSlug: 'call_log',
  filter: { status: 'error' },
  bucket: { field: 'created', interval: 'day' },
})
// 'query($from: String!, $to: String!) {
//   call_log(filter: {status: "error"}, groupBy: { field: "created", interval: DAY, from: $from, to: $to })
//   { groups { key value } }
// }'
```

Normalizes `interval` (case-insensitively) against the GraphQL `TimeInterval` enum (`MINUTE | HOUR | DAY | WEEK | MONTH | QUARTER | YEAR`) and `metric` against `AggregationMetric` (`COUNT | SUM | AVG | MIN | MAX`). Throws on unknown values, missing `bucket.field`, or `metric != count` without a `metricField` — `useDataSource` surfaces the throw via its `error.value` instead of firing a half-formed request.

See [`useDataSource`](./composables/use-data-source.md) for the consumer composable.
