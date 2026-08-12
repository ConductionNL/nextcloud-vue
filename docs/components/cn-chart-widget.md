import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnChartWidget.md'

# CnChartWidget

ApexCharts wrapper for dashboard and detail page widgets. Supports area, line, bar, pie, donut, and radialBar chart types with Nextcloud-themed defaults. The chart library is a peer dependency — consuming apps must install `apexcharts` and `vue-apexcharts`.

## Try it

<Playground component="CnChartWidget" />

## Usage

```vue
<!-- Area chart with categories -->
<CnChartWidget
  type="area"
  :series="[{ name: 'Requests', data: [10, 41, 35, 51, 49, 62] }]"
  :categories="['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']"
  :height="250" />

<!-- Pie chart -->
<CnChartWidget
  type="pie"
  :series="[44, 55, 13, 33]"
  :labels="['Active', 'Pending', 'Closed', 'Draft']" />

<!-- Bar chart with custom options -->
<CnChartWidget
  type="bar"
  :series="barSeries"
  :options="{ plotOptions: { bar: { horizontal: true } } }" />
```

When ApexCharts is not available a fallback slot or `unavailableLabel` is shown:

```vue
<CnChartWidget type="area" :series="series">
  <template #fallback>
    <p>Charts require the apexcharts package.</p>
  </template>
</CnChartWidget>
```

## Manifest usage (recommended)

When `CnDashboardPage` resolves a widget definition with `type: "chart"`, it mounts CnChartWidget automatically. Manifest authors do NOT mount this component themselves — declare a chart widget in `pages[].config.widgets[]` instead:

```json
{
  "id": "sla-trend",
  "title": "myapp.sla_trend",
  "type": "chart",
  "props": {
    "chartKind": "line",
    "series": [{ "name": "SLA %", "data": [82, 88, 91, 93] }],
    "categories": ["Q1", "Q2", "Q3", "Q4"],
    "options": { "stroke": { "width": 3 } }
  }
}
```

The dispatcher forwards `props.chartKind` as the apex `type` and passes through `series`, `categories`, `labels`, `options`, `colors`, `toolbar`, `legend`, `height`, `width`, `unavailableLabel`.

### Height on a dashboard tile

A dashboard tile's height is fixed by its grid units, so a chart tile that authors no `height` gets `'100%'` — the chart fits the tile. The standalone default (a pinned 250px) is taller than the content box of a typical `gridHeight: 4` tile, which made the tile scroll the graph instead of showing it. Author a `height` in the widget's `props` (or its in-app `content`) to pin one deliberately.

Percentage heights need an ancestor with a resolved height. Inside `CnWidgetWrapper` that is already true; in a page region sized by its content, pin a pixel height instead.

## `dataSource` — resolving series + categories from OpenRegister

`CnChartWidget` accepts a `dataSource` block that resolves `series` / `categories` / `labels` from a GraphQL query against OpenRegister. Three shapes are supported:

### Count shorthand

```js
dataSource: {
  schema: 'meeting',
  filter: { lifecycle: 'review' },
  aggregate: 'count',
}
// → { count: 4 } (use the raw `graphql:` form for chart series)
```

### Bucket shorthand (time series)

Emits OpenRegister's `groupBy` argument with a time interval and returns `{ series, categories }` ready to feed into a line/bar chart:

```js
dataSource: {
  schema: 'call_log',
  filter: { status: 'error' },
  bucket: {
    field: 'created',
    interval: 'day',                  // case-insensitive → DAY
    fromVar: 'from',                  // default 'from'
    toVar: 'to',                      // default 'to'
    staticRange: {                    // fallback when no dashboard range
      from: '2026-05-01T00:00:00.000Z',
      to:   '2026-05-22T00:00:00.000Z',
    },
  },
}
```

When mounted under a [`CnDashboardPage`](./cn-dashboard-page.md) with `dateRange.enabled`, the widget injects `cnDashboardDateRange` and uses the dashboard's currently-selected `{ from, to }` for the GraphQL variables — every chart on the page tracks the same range. If no dashboard range is available the widget falls back to `bucket.staticRange`; if neither is available no query is fired and the chart shows its fallback / unavailable state.

Non-count metrics are supported via `metric` (`'sum' | 'avg' | 'min' | 'max'`, case-insensitive) + a required `metricField`:

```js
bucket: {
  field: 'created',
  interval: 'week',
  metric: 'sum',
  metricField: 'amount',
  staticRange: { from: '…', to: '…' },
}
```

### Raw GraphQL

```js
dataSource: {
  graphql: {
    query: 'query { meeting { groups { key value } } }',
    selectors: {
      series:     'meeting.groups[].value',
      categories: 'meeting.groups[].key',
    },
  },
}
```

The selector path syntax supports dot-paths with optional `[]` flat-maps. See [`selectByPath`](../utilities/composables/use-graph-q-l.md) for the full path grammar.

### Aggregation shorthand (Wave 3, #91) — group-by over an OR collection

`aggregate` as an **object** (the string form `aggregate: 'count'` stays the count shorthand above) runs a categorical group-by over the schema's objects — the "requests by status" / "cases by type" / "top skills" chart in one declarative block:

```js
dataSource: {
  register: 'crm',
  schema: 'request',
  filter: { active: true },              // shared @-token grammar
  aggregate: {
    groupBy: 'status',                   // the categorical field
    metric: 'count',                     // 'count' (default) | 'sum'
    sumField: 'hours',                   // required for metric: 'sum'
    topN: 10,                            // keep the 10 largest groups (sorted desc)
    otherBucket: true,                   // fold the remainder into a translated "Other" slice
    labelResolve: {                      // when groupBy holds reference uuids:
      schema: 'billingCategory',         //   resolve each key to the referenced object…
      labelField: 'name',                //   …'s display label (default 'name')
      colorField: 'color',               //   optional per-category colour (feeds the colorMap path)
    },
  },
  drilldown: { route: 'Requests', filterParam: 'status' },
}
```

Server-first: OpenRegister's `/grouped` facet endpoint does the aggregation (the same facet the `groupBy` shorthand reaches), so the client never pulls a collection just to count it. When that endpoint is unavailable (older OR) the widget falls back to fetching the collection (capped at 1000 objects) and grouping client-side. `labelResolve` resolves reference keys through the **shared object store** (per-id cache + in-flight dedup — the `fkResolve` cell pattern), degrading to the raw key when an object can't be loaded. An explicit `colorMap` prop wins over `labelResolve.colorField` colours.

### Drilldown — segment/bar click → filtered route

A `drilldown: { route, filterParam }` block on the `dataSource` makes every slice / bar click navigate with the clicked category's **raw** key (the uuid / status value, not the resolved display label) in the query: `{ [filterParam]: rawKey }`. A `route` starting with `/` is treated as a path, anything else as a route name. The folded "Other" bucket never navigates (it has no single category value). Works with both the `aggregate` and legacy `groupBy` forms.

## `endpointSource` — endpoint-bound series/labels (Wave 2, #91)

Binds the chart to an arbitrary app REST endpoint through the shared [`useEndpointSource`](../utilities/composables/use-endpoint-source.md) engine (token-resolved `params`, request dedup + short-TTL cache, `cn:page:refresh` wiring; the chart's own `refresh()` / `cn:widget:refresh` handler force-refetches it too). **Exactly one of `dataSource` | `endpointSource`** (validator-enforced).

The response mapping keys live INSIDE the block — the flat `series` / `labels` prop names already carry the static data:

```js
// ARRAY-of-points payload (pipelinq /api/analytics/trends → { series: [{ date, value }] }):
endpointSource: {
  url: '/apps/pipelinq/api/analytics/trends',
  params: { metric: 'leads', period: '@workspace.datePreset?' },
  responsePath: 'series',
  labelsPath: 'date',                          // per-item field path
  series: [{ name: 'Leads', path: 'value' }],  // per-item field path
}

// OBJECT payload with parallel arrays:
endpointSource: {
  url: '/apps/myapp/api/pipeline-by-stage',
  labelsPath: 'labels',                        // → payload.labels (array)
  series: [{ name: 'Open value', path: 'open' }], // → payload.open (number array)
}
```

Pie-family charts (`pie` / `donut` / `radialBar`) flatten the FIRST mapped series into the flat value array ApexCharts expects. `params` re-resolve + the chart refetches when the dashboard date range changes (the page publishes `dateFrom` / `dateTo` / `datePreset` into the workspace context).

## `views` — in-widget display switcher (Wave 3, #91)

An optional `views` array renders a compact pill row above the chart that toggles which named series / value format render — pure display, no series arithmetic (the €/% and hours/% toggles from the Wave-4 evaluation):

```js
views: [
  { key: 'eur', label: '€', series: ['Margin €'], valueFormat: 'currency' },
  { key: 'pct', label: '%', series: ['Margin %'], valueFormat: 'percent' },
]
```

Each entry is `{ key, label?, series?, valueFormat? }`: `series` (an array of series **names**) filters which resolved cartesian series render (a filter that matches nothing falls back to all series, so a typo never blanks the chart; pie-family series have no names to filter on), and `valueFormat` overrides the widget-level `valueFormat` while the view is active. The first view is active by default; fewer than two views render no switcher.

## Value-axis baseline

ApexCharts frames the value axis to the data range by default. For a series like `[7, 6]` that puts 7 at the very top of the plot and 6 at the very bottom, so a difference of **one** reads as a total collapse. `valueAxisBaseline` is the guard against that.

| Value | Behaviour |
| --- | --- |
| `'auto'` (default) | Anchors **bar** and **area** at zero; keeps **line** off zero but widens the window when it gets too narrow to be honest. |
| `'zero'` | Always anchors at zero. |
| `'fit'` | Plain ApexCharts autoscaling. |

The split is not arbitrary. Bar and area encode magnitude by **length and area**, so a truncated baseline makes the mark misstate the ratio — a bar twice as tall must mean twice as much. Line encodes **position**, so it may legitimately sit off zero; there the rule is instead that the visible window must span at least a quarter of the data's magnitude, which stops a 1-in-1000 wiggle from filling the plot.

The ceiling is rounded up to a nice number (7 → 8, 62 → 80, 210 → 250) so the peak is not glued to the top of the plot and the ticks land on round values.

Three cases always fall back to autoscaling, because a zero floor would be wrong or useless: pie-family charts, any series that goes negative (clamping would crop real values), and an empty series. An explicit `options.yaxis.min` / `max` still wins through the deep-merge.

Reach for `'fit'` when the series genuinely lives far from zero — a percentage hovering between 95 and 99, a temperature — where a zero baseline flattens the whole signal into one line. On a dashboard it can be set per widget from the manifest:

```json
{ "type": "chart", "props": { "chartKind": "line", "valueAxisBaseline": "fit" } }
```

## Theming

The chart follows the Nextcloud theme in both light and dark mode, with no configuration. Everything drawn inside the SVG is themed through chart options (`foreColor`, grid, legend and axis label colours all read `var(--color-*)`), and apexcharts' HTML chrome — the hover tooltip, the crosshair axis tooltips, the toolbar menu and its icons — is restyled from the same tokens in the component's stylesheet.

That override is why `options.tooltip.theme` has no visible effect: both apexcharts themes are hardcoded palettes, so either one is wrong in the other mode. The tokens flip themselves, which also covers high-contrast and custom (nldesign) themes.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | String | `'area'` | Chart type: `'area'`, `'line'`, `'bar'`, `'pie'`, `'donut'`, `'radialBar'` |
| `series` | Array | `[]` | Data series. Format: `[{ name, data[] }]` for cartesian charts; `number[]` for pie/donut |
| `categories` | Array | `[]` | X-axis category labels (line, area, bar charts) |
| `labels` | Array | `[]` | Segment labels (pie, donut charts) |
| `height` | Number \| String | `250` | Chart height. A number pins pixels; a percentage (`'100%'`) fits the container; `'auto'` derives it from the width |
| `width` | Number \| String | `'100%'` | Chart width (defaults to full container width) |
| `options` | Object | `{}` | Custom ApexCharts options deep-merged with Nextcloud defaults |
| `colors` | Array | `[]` | Color palette — defaults to Nextcloud CSS variable colors |
| `toolbar` | Boolean | `false` | Show/hide the ApexCharts toolbar (zoom, download) |
| `legend` | Boolean | `true` | Show/hide the chart legend |
| `unavailableLabel` | String | `'Chart library not available'` | Text shown when ApexCharts is not installed |
| `dataSource` | Object | `null` | Optional OpenRegister GraphQL block — see [`dataSource`](#datasource--resolving-series--categories-from-openregister) above |
| `horizontal` | Boolean | `false` | Render `type: "bar"` charts horizontally (row bars). An explicit `options.plotOptions.bar.horizontal` still wins. |
| `legendPosition` | String | `''` | Legend placement override: `top \| bottom \| left \| right`. Empty keeps the automatic placement (bottom for pie-family, top otherwise). |
| `valueAxisBaseline` | String | `'auto'` | How the value axis picks its baseline — see [Value-axis baseline](#value-axis-baseline) below. `auto` anchors bar/area at zero and stops line charts over-zooming; `zero` always anchors at zero; `fit` restores plain ApexCharts autoscaling. |
| `valueFormat` | String \| Object | `null` | Named value formatter applied to the VALUE axis labels AND the tooltip: `"currency"` (Intl currency, 0 decimals), `"currency-compact"` (compact notation, e.g. `€ 1,2K`), `"percent"`. Object form `{ name, currency?, decimals? }` overrides the ISO code (EUR default, guarded) and fraction digits. With `horizontal` bars the formatter moves to the x-axis (the value axis flips). |
| `colorMap` | Object | `null` | Per-category colour map (`{ categoryLabel: cssColor }`) for pie/donut/radialBar slices and bar categories (bars switch to `distributed` rendering so each category gets its colour). Unmapped categories keep the default palette colour. |
| `emptyLabel` | String | `''` | Empty-state message rendered INSTEAD of the chart when the resolved series contain no data points. Empty keeps the pre-existing empty-canvas behaviour. |
| `endpointSource` | Object | `null` | Endpoint-bound series/labels — see [`endpointSource`](#endpointsource--endpoint-bound-serieslabels-wave-2-91) above. Exactly one of `dataSource` \| `endpointSource`. |
| `views` | Array | `[]` | In-widget display switcher — see [`views`](#views--in-widget-display-switcher-wave-3-91) above. Each entry `{ key, label?, series?, valueFormat? }`. |

All display props are additive (`chart` widget manifest `content` /
`props` keys of the same names pass through CnDashboardPage's dispatcher).

### Slots

| Slot | Description |
|------|-------------|
| `fallback` | Content rendered when ApexCharts is not available |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnChartWidget.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnChartWidget/CnChartWidget.vue) and update automatically whenever the component changes.

<GeneratedRef />

## Refresh wiring

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `widgetId` | String | `''` | Matches `cn:widget:refresh` event-bus events (broadcast by CnWidgetWrapper's Refresh); on a matching id the chart re-queries its `dataSource`. |

The chart also subscribes to `cn:page:refresh`, the channel the **page-level** Refresh action broadcasts on (`CnDashboardPage` / `CnDetailPage`). That one carries no widget id — a page refresh refreshes everything on the page — so a chart placed without a `widgetId` still reloads.

Both channels re-query `dataSource` (the GraphQL, time-bucket, group-by and aggregate paths). They differ on `endpointSource`: the per-widget channel and the ref-callable `refresh()` refetch it, while the page channel leaves it to `useEndpointSource`, which subscribes to `cn:page:refresh` itself. Refetching it twice would issue two HTTP requests, not one — a forced fetch drops the in-flight dedup entry.
