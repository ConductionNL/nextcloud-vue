# useGraphQL

Reactive wrapper for POSTing GraphQL queries against the OpenRegister GraphQL endpoint (`/index.php/apps/openregister/api/graphql`). Re-runs whenever the input `query` or `variables` change.

## Signature

```js
import { useGraphQL, selectByPath } from '@conduction/nextcloud-vue'

const { data, loading, error, refetch } = useGraphQL(query, variables, options)
```

## Arguments

| Name | Type | Description |
|------|------|-------------|
| `query` | `string \| Ref<string>` | GraphQL document. May be a ref so the composable re-runs when it changes. |
| `variables` | `object \| Ref<object>` | Variables passed alongside `query`. May be a ref. |
| `options.endpoint` | `string` | Endpoint URL. Defaults to OR's GraphQL route via `generateUrl`. |
| `options.operationName` | `string` | Optional GraphQL `operationName`. |
| `options.immediate` | `boolean` | Run on mount (default `true`). Set `false` to defer the first request. |

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `data` | `Ref<any>` | Response `data` (envelope unwrapped). |
| `loading` | `Ref<boolean>` | True while the request is in flight. |
| `error` | `Ref<Error\|null>` | Wrapped transport error or joined GraphQL `errors[].message`. |
| `refetch` | `() => Promise<void>` | Re-issue the request manually. |

## Selector helper — `selectByPath(obj, selector)`

Lightweight dot-path reader used by the manifest `dataSource.graphql.selectors` map:

- `data.foo.totalCount` → scalar
- `data.foo.edges[].node.value` → list (each `[]` flat-maps over an array)

Not a full JSONPath — just dot-paths and `[]` hops. Returns `undefined` if any segment is missing.

## Notes

- No global cache. For dashboard widgets the `liveUpdatesPlugin` invalidates cached collections, so a manifest-driven re-render naturally re-runs the query through `useDataSource`.
- Auth uses `@nextcloud/axios`, which already handles session cookies and CSRF; the OR endpoint is `@NoCSRFRequired` so the request token is optional.
