# useEndpointSource

ONE coherent endpoint data binding shared by the abstract widgets (Wave 2, [#91](https://github.com/ConductionNL/nextcloud-vue/issues/91)). Resolves a manifest-authored `endpointSource` block — an arbitrary app REST endpoint OpenRegister's aggregations can't express (a bespoke analytics controller, a summary payload) — into reactive `{ data, loading, error, refetch }`.

Consumed by [`CnStatWidget`](../../components/cn-stat-widget.md), [`CnDeltaWidget`](../../components/cn-delta-widget.md), [`CnChartWidget`](../../components/cn-chart-widget.md), and [`CnWidgetObjectTable`](../../components/cn-widget-object-table.md); usable directly by consumer apps.

## Signature

```js
import { useEndpointSource } from '@conduction/nextcloud-vue'

const { data, loading, error, refetch } = useEndpointSource(endpointSource, {
  ctx: () => ({ objectId, object, workspace, config }), // token context (object | ref | getter)
  widgetId: 'kpi-revenue',                              // matches cn:widget:refresh payloads
  refreshKey: myReactiveToken,                          // app-local refresh escape hatch
})
```

`endpointSource` may be an object, a ref, or a getter (`() => props.endpointSource`). When `null` / without a `url`, the composable never queries and `data.value` stays `null`.

## The `endpointSource` block

```js
{
  url: '/apps/pipelinq/api/analytics/overview', // app-relative (generateUrl) or absolute
  method: 'GET',                                // 'GET' (default) | 'POST' (params → JSON body)
  params: { period: '@workspace.datePreset?' }, // SAME token grammar as widget filters
  responsePath: 'summary',                      // dot-path pluck (default: whole body)
}
```

- **Token resolution** — `params` values pass through `resolveFilterTokens`, exactly like widget filters: `@me`, `@now`, `@today`, `@today±Nd`, `@monthStart`/`@quarterStart`/`@yearStart`, `@objectId`/`@object.<field>` (detail context), `@workspace.<key>`/`@config.<key>`. A trailing `?` marks a value OPTIONAL (dropped when unresolved); a REQUIRED token that stays unresolved **blocks** the fetch (no request, no error) until the page context provides it. The `url` itself may interpolate `@page.*`/`@workspace.*`/`@config.*`/`@objectId`/`@object.*` inline — unresolved URL tokens collapse to an empty string.
- **Shared cache + dedup** — one in-flight promise + short-TTL (5 min) cache entry per `(method, url, resolved params)`, module-wide. Four KPI tiles reading the same overview endpoint issue ONE request per render pass — the same per-period semantics pipelinq's `dashboardData.js` used. `responsePath` plucking happens per subscriber, after the shared response resolves.
- **Reactivity** — the resolved request signature is watched: when the page-level workspace context changes (the dashboard date-range pills publish `dateFrom`/`dateTo`/`datePreset`; page filters publish their keys), params re-resolve and the widget refetches automatically.

## Refresh wiring

Grounded in the library's own event-bus channels (what `CnActionsMenu` broadcasts):

| Signal | Behaviour |
|--------|-----------|
| `cn:page:refresh` | Force-refetch past the shared cache (page-level Refresh action). |
| `cn:widget:refresh` with matching `widgetId` | Force-refetch (per-widget Refresh action). Requires a non-empty `widgetId` option. |
| `refreshKey` bump | Force-refetch. Escape hatch for **app-local** refresh signals the library cannot observe (e.g. a `Vue.observable` token like pipelinq's `refreshDashboardData()`). |
| `refetch()` | Force-refetch. `refetch(false)` allows a warm cache hit. |

## Helpers

- [`fetchEndpointSource(config, ctx, { force? })`](../fetch-endpoint-source.md) — one-shot cached fetch for imperative (Options-API) flows.
- [`invalidateEndpointSourceCache()`](../invalidate-endpoint-source-cache.md) — drop every cached response (tests, hard refresh flows).

## Validation

In manifests, `endpointSource` is **exactly-one-of** with the widget's OpenRegister binding (`source` on stat/delta/object-table, `dataSource` on chart) — enforced by `validateManifestV2()` as a post-schema check (schema v2.14.0, `$defs/endpointSource` / `$defs/chartEndpointSource`).
