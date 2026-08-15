# useDataSource

Resolves a manifest `dataSource` block on a dashboard widget into reactive `{ data, loading, error, refetch }`. Backed by [`useGraphQL`](./use-graph-q-l.md) for OpenRegister forms and [`useBrokeredCall`](./use-brokered-call.md) for the brokered (external-provider) form.

## Signature

```js
import { useDataSource, buildCountQuery } from '@conduction/nextcloud-vue'

const { data, loading, error, refetch } = useDataSource(dataSource)
```

`dataSource` may be an object, a ref, or a getter function (`() => props.dataSource`) for reactive inputs. When `null`/`undefined` the composable never queries and `data.value` stays `null`.

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

### Brokered — `{ broker: { credentialId, provider?, method?, path, query?, headers?, body?, responsePath? } }`

Fetches from an **external provider through the OpenRegister credential broker** instead of OR GraphQL, so a no-code manifest app renders authenticated third-party API data **without ever handling the secret**. Routed to [`useBrokeredCall`](./use-brokered-call.md).

```json
{
  "broker": {
    "credentialId": "5f0e…",
    "provider": "github",
    "method": "GET",
    "path": "/repos/ConductionNL/openregister/issues",
    "query": { "state": "open", "per_page": 20 },
    "responsePath": "0.title"
  }
}
```

`data.value` is the parsed upstream body (JSON when it looks like JSON), optionally sliced by `responsePath`. `provider` is advisory metadata for the manifest/editor only — the broker resolves the upstream base URL from the credential server-side.

**Zero-secret model.** The browser never receives the credential. `useDataSource` POSTs `{ appId, method, path, headers?, body? }` to `POST /apps/openregister/api/credentials/{credentialId}/session-request`; OpenRegister loads the credential the current user owns, injects the secret server-side, calls the upstream, and returns `{ status, headers, body }`. Failures (403 broker-refused, 502 upstream-unreachable, any non-2xx) resolve into a clean, secret-free `error.value`.

**Requirements.**

- The OpenRegister session-broker endpoint above must be available.
- The user must **own** a credential whose `allowedApps` includes this manifest app id.
- The **manifest app id** is taken from `options.appId` when given, otherwise from the `cnAppId` value `CnAppRoot` provides — resolved automatically when `useDataSource` runs inside a component `setup()`. Pass `useDataSource(ds, { appId })` when calling outside a `CnAppRoot` tree.

## Helpers

- `buildCountQuery(schemaSlug, filter)` — produces the same query string the shorthand uses. Useful when you want the shorthand semantics plus a custom selector key.

## Consumed by

- [`CnStatsBlockWidget`](../../components/cn-stats-block-widget.md) — reads `data.value.count`.
- [`CnChartWidget`](../../components/cn-chart-widget.md) (optional `dataSource` prop) — reads `data.value.{series,categories,labels}`.

## Notes

- The shorthand currently only supports `aggregate: 'count'`. Richer aggregates (`groupBy`, `sum`, `avg`) require the OR backend changes tracked in [openregister#1455](https://github.com/ConductionNL/openregister/issues/1455).
