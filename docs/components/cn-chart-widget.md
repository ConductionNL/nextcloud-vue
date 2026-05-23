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

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | String | `'area'` | Chart type: `'area'`, `'line'`, `'bar'`, `'pie'`, `'donut'`, `'radialBar'` |
| `series` | Array | `[]` | Data series. Format: `[{ name, data[] }]` for cartesian charts; `number[]` for pie/donut |
| `categories` | Array | `[]` | X-axis category labels (line, area, bar charts) |
| `labels` | Array | `[]` | Segment labels (pie, donut charts) |
| `height` | Number \| String | `250` | Chart height in pixels |
| `width` | Number \| String | `'100%'` | Chart width (defaults to full container width) |
| `options` | Object | `{}` | Custom ApexCharts options deep-merged with Nextcloud defaults |
| `colors` | Array | `[]` | Color palette — defaults to Nextcloud CSS variable colors |
| `toolbar` | Boolean | `false` | Show/hide the ApexCharts toolbar (zoom, download) |
| `legend` | Boolean | `true` | Show/hide the chart legend |
| `unavailableLabel` | String | `'Chart library not available'` | Text shown when ApexCharts is not installed |
| `dataSource` | Object | `null` | Optional OpenRegister GraphQL block — see [`dataSource`](#datasource--resolving-series--categories-from-openregister) above |

### Slots

| Slot | Description |
|------|-------------|
| `fallback` | Content rendered when ApexCharts is not available |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnChartWidget.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnChartWidget/CnChartWidget.vue) and update automatically whenever the component changes.

<GeneratedRef />
