# useDataSource

Resolves a manifest `dataSource` block on a dashboard widget into reactive `{ data, loading, error, refetch }`. Backed by [`useGraphQL`](./use-graph-q-l.md).

## Signature

```js
import { useDataSource, buildCountQuery } from '@conduction/nextcloud-vue'

const { data, loading, error, refetch } = useDataSource(dataSource)
```

`dataSource` may be an object or a ref. When `null`/`undefined` the composable never queries and `data.value` stays `null`.

## Manifest forms

### Shorthand — `{ register, schema, filter?, aggregate: 'count' }`

The library builds:

```graphql
{ <schemaSlug>(filter: <filter>) { totalCount } }
```

`data.value` resolves to `{ count: number }`. `register` is decorative — the GraphQL field name comes from the schema slug.

### Raw — `{ graphql: { query, variables?, selectors } }`

`query` and `variables` go straight to `useGraphQL`. Each entry in `selectors` runs through [`selectByPath`](./use-graph-q-l.md#selector-helper--selectbypathobj-selector); `data.value` is the resulting map keyed by selector keys.

```json
{
  "graphql": {
    "query": "query { meeting { totalCount } }",
    "selectors": { "count": "meeting.totalCount" }
  }
}
```

## Helpers

- `buildCountQuery(schemaSlug, filter)` — produces the same query string the shorthand uses. Useful when you want the shorthand semantics plus a custom selector key.

## Consumed by

- [`CnStatsBlockWidget`](../../components/cn-stats-block-widget.md) — reads `data.value.count`.
- [`CnChartWidget`](../../components/cn-chart-widget.md) (optional `dataSource` prop) — reads `data.value.{series,categories,labels}`.

## Notes

- The shorthand currently only supports `aggregate: 'count'`. Richer aggregates (`groupBy`, `sum`, `avg`) require the OR backend changes tracked in [openregister#1455](https://github.com/ConductionNL/openregister/issues/1455).
