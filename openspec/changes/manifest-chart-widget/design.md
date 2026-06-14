# Design: manifest-chart-widget

## Context

`CnDashboardPage`'s widget dispatcher today has three branches —
**tile**, **custom slot**, **NC Dashboard API** — plus an "unknown
fallback" with the `unavailableLabel` text. `CnChartWidget` exists in
the library and wraps apexcharts, but the dispatcher has no branch for
`type: "chart"`. As a result every chart-rendering page (procest
`Doorlooptijd`, opencatalogi Dashboard tiles) declares `type: "custom"`
on its page and ships its own component, which side-steps the manifest.

The library-side `widgetDef` schema (`src/schemas/app-manifest.schema.json`,
`$defs.widgetDef`) is intentionally permissive: `type` is a free-form
string ("Conventional values: \"custom\"… \"tile\"… or any Nextcloud
Dashboard API widget id") and `props` is `additionalProperties: true`.
That permissiveness is what lets us add a fourth conventional value
(`"chart"`) without bumping the schema version.

## Decision Drivers

- **Don't break back-compat** — every existing consumer
  (decidesk, mydash, opencatalogi, pipelinq, procest) reads the
  dispatcher today.
- **Keep the schema stable** — extending the closed `pageType` enum
  requires a schema bump (ADR-024 §10); extending the open `widgetDef.type`
  conventional-value list does NOT.
- **Stay in lock-step with apexcharts** — `chartKind` maps 1:1 to
  apexcharts' `chart.type` (`line | bar | donut | area | pie |
  radialBar`); we don't invent our own taxonomy.
- **Defer the data resolver** — wiring an OpenRegister aggregation
  endpoint is its own change. The widget contract pins the manifest
  shape so the resolver lands transparently.

## Decision

### Dispatcher branch

Add a fourth branch to `CnDashboardPage`'s widget dispatcher, **between
the tile branch and the custom-slot branch**:

```
1. Tile widget          (widgetDef.type === 'tile')
2. Custom slot widget   (#widget-{id} scoped slot is provided)  ← escape hatch
3. Chart widget         (widgetDef.type === 'chart')            ← NEW
4. NC Dashboard API     (widgetDef.itemApiVersions[] present)
5. Unknown fallback     (unavailableLabel text)
```

The custom-slot branch comes BEFORE the chart branch so apps with a
matching `#widget-{id}` slot win. This is the documented escape hatch:
apps that need apexcharts features outside the manifest contract (e.g.
custom annotations, complex `xaxis.events`) keep the slot path.

### Widget API

```js
{
  id: 'doorlooptijd-trend',                  // matches layoutItem.widgetId
  title: 'procest.doorlooptijd.monthly_trend', // i18n key
  type: 'chart',                             // dispatcher selector
  iconClass: 'icon-graph',                   // optional, passed to wrapper

  props: {
    chartKind: 'line',                       // line|bar|donut|area|pie|radialBar
    series: [{ name: 'SLA %', data: [...] }],
    categories: ['Jan', 'Feb', ...],         // omit for donut/pie
    labels: ['Active', 'Closed'],            // omit for non-pie
    options: { /* deep-merged with CnChartWidget defaults */ },
    colors: [],                              // optional palette override
    toolbar: false,
    legend: true,
    height: 280,                             // pixel or string
    width: '100%',

    dataSource: {                            // RESERVED — round-tripped, not read yet
      // option A: HTTP fetch
      url: '/index.php/apps/procest/api/charts/sla-trend',
      // option B: OpenRegister aggregation
      // register: 'cases', schema: 'case', groupBy: 'caseType', aggregate: 'count'
    }
  }
}
```

Property mapping inside the dispatcher:

| widgetDef.props key | CnChartWidget prop | Notes |
|---|---|---|
| `chartKind` | `type` | renamed to avoid clash with apexcharts' own `type` |
| `series` | `series` | direct |
| `categories` | `categories` | direct |
| `labels` | `labels` | direct |
| `options` | `options` | direct |
| `colors` | `colors` | direct |
| `toolbar` | `toolbar` | direct |
| `legend` | `legend` | direct |
| `height` | `height` | direct |
| `width` | `width` | direct |

Unknown keys are forwarded as `v-bind="props"` so apps can pass
`unavailableLabel` etc. without a dispatcher edit.

### Why a method, not a separate manifest field

`widgetDef.props` already carries free-form widget-specific data (NC
Dashboard widgets, future widget types). Using `props` keeps every
widget type consistent: dispatcher branches on `widgetDef.type`, then
hands `props` to the widget component. Adding sibling `chartConfig` /
`chart` fields would fragment the API.

### Data source resolver — why deferred

Two resolver options:

**Option A — HTTP fetch (`dataSource.url`)**: Widget mounts, makes a
GET to the URL, expects `{ series, categories, labels }` back. Simple.
Apps own the endpoint. Out of scope today because:

- procest's series are pure JS computed from cases already loaded by
  the dashboard's data store; an HTTP round-trip is *more* work, not
  less.
- The URL contract (response shape, error envelope, auth) deserves its
  own ADR alongside the manifest renderer's
  `/apps/{appId}/api/manifest` convention.

**Option B — OpenRegister aggregation (`dataSource.{register, schema,
groupBy, aggregate}`)**: Widget mounts, calls a hypothetical
`POST /apps/openregister/api/aggregate` with the spec, gets back the
series. Powerful — turns the dashboard widget into a SQL-equivalent
declarative pivot. Out of scope today because:

- The aggregation endpoint doesn't exist yet on OpenRegister.
- The aggregation taxonomy (`count`, `sum`, `avg`, `bucket-by-date`,
  custom `having` clauses) is a meaningful design problem on its own.

By pinning the union shape now (`dataSource: { url } | { register,
schema, groupBy, aggregate }`), both resolvers land later without a
manifest schema bump or consumer-side migration.

## Consequences

- **Apps can drop `type: "custom"`** for any dashboard whose widgets
  are charts + tiles. procest, opencatalogi, mydash benefit immediately;
  pipelinq when it adopts the manifest.
- **`widgetDef.type === "chart"` becomes a documented conventional
  value** alongside `tile`, `custom`, and NC widget ids. The schema's
  `widgetDef.type` description is updated to mention it.
- **`CnChartWidget` becomes the canonical chart primitive** for the
  fleet. Apps that mount apexcharts directly drift from the standard
  and are surfaced by ADR-029 route-reachability gate's manifest-drift
  check.
- **No schema version bump** — the change is a conventional-value
  extension on an open `type` field.

## Alternatives Considered

1. **New page type `type: "chart-dashboard"`** — Rejected. Would
   require a schema bump (page `type` enum is closed). Charts belong
   *inside* dashboards, not as a sibling page type.
2. **Top-level `chartConfig` field on widgetDef** — Rejected. Would
   fragment the manifest API; current widget types ride on `props`.
3. **Auto-mount CnChartWidget for every NC API widget that exposes a
   chart** — Rejected. NC Dashboard API widgets are HTML-rendered, not
   data-feed-rendered; the contract is incompatible.
4. **Resolve dataSource in the dispatcher itself** — Rejected. Couples
   chart logic to fetching/aggregation; the dispatcher stays
   render-only and the resolver lands in a follow-up.
