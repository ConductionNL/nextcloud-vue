CnChartWidget wraps ApexCharts for use inside dashboard widget slots. Consuming apps must install `apexcharts` and `vue-apexcharts` as dependencies. The styleguide environment includes these packages, so examples render live.

## Manifest usage (recommended)

When `CnDashboardPage` resolves a widget definition with `type: "chart"`, it mounts CnChartWidget automatically and forwards `props.chartKind` as the apex `type`. Manifest authors do NOT need to mount this component themselves:

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

Supported `props` keys forwarded by the dispatcher: `chartKind` (→ `type`), `series`, `categories`, `labels`, `options`, `colors`, `toolbar`, `legend`, `height`, `width`, `unavailableLabel`, plus the display passthrough `horizontal`, `legendPosition`, `valueFormat`, `colorMap`, `emptyLabel`, `views`. The `dataSource` field resolves declaratively: `aggregate: 'count'` / raw `graphql` via GraphQL, `bucket` / `groupBy` / the OBJECT-form `aggregate` (Wave 3: group-by + topN/Other + labelResolve) via OpenRegister's REST aggregation facets, with an optional sibling `drilldown: { route, filterParam }` that navigates on segment/bar click with the raw category key in the query.

Area chart — time series data:

```vue
<CnChartWidget
  type="area"
  :series="[
    { name: 'Objects created', data: [12, 28, 35, 20, 45, 38, 52] },
    { name: 'Objects updated', data: [5, 15, 22, 18, 30, 25, 40] },
  ]"
  :categories="['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
  :height="220" />
```

Bar chart — category comparison:

```vue
<CnChartWidget
  type="bar"
  :series="[{ name: 'Count', data: [42, 128, 15, 84, 256] }]"
  :categories="['Contacts', 'Products', 'Projects', 'Tasks', 'Documents']"
  :height="200" />
```

Pie chart — distribution:

```vue
<CnChartWidget
  type="pie"
  :series="[320, 180, 95, 45]"
  :labels="['Active', 'Pending', 'Archived', 'Draft']"
  :height="240" />
```

Donut chart with center label:

```vue
<CnChartWidget
  type="donut"
  :series="[4200, 421, 200]"
  :labels="['Published', 'Draft', 'Archived']"
  :height="240" />
```

Custom `width`, `colors`, `options`, `toolbar`, `legend`, and `unavailableLabel`:

```vue
<CnChartWidget
  type="line"
  :series="[{ name: 'Requests', data: [10, 40, 28, 51, 42, 80] }]"
  :categories="['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']"
  :height="200"
  width="100%"
  :colors="['#0082c9', '#46ba61', '#e9a300']"
  :options="{ stroke: { width: 3 } }"
  :toolbar="true"
  :legend="false"
  unavailable-label="Chart library not loaded" />
```

Fallback slot — shown when ApexCharts is not available:

```vue
<CnChartWidget
  type="area"
  :series="[]"
  :height="200">
  <template #fallback>
    <div style="padding: 24px; color: var(--color-text-maxcontrast); text-align: center;">
      Install <code>apexcharts</code> and <code>vue-apexcharts</code> to see charts.
    </div>
  </template>
</CnChartWidget>
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | Number\|String | `'100%'` | Chart width (fills container by default) |
| `options` | Object | `{}` | Custom ApexCharts options deep-merged with the built-in defaults |
| `colors` | Array | `[]` | Custom color palette (defaults to Nextcloud theme colors) |
| `toolbar` | Boolean | `false` | Show or hide the ApexCharts toolbar (zoom, download, etc.) |
| `legend` | Boolean | `true` | Show or hide the chart legend |
| `unavailableLabel` | String | `'Chart library not available'` | Text shown when ApexCharts cannot be loaded |
| `horizontal` | Boolean | `false` | Render `type: "bar"` charts horizontally (row bars); an explicit `options.plotOptions.bar.horizontal` still wins |
| `legendPosition` | String | `''` | Legend placement override (`top`/`bottom`/`left`/`right`); empty keeps the automatic placement |
| `valueFormat` | String\|Object | `null` | Named value formatter for the value axis + tooltip: `'currency'`, `'currency-compact'`, `'percent'`, or `{ name, currency?, decimals? }` |
| `colorMap` | Object | `null` | Per-category colour map (`{ categoryLabel: cssColor }`) for pie-family slices and (distributed) bar categories |
| `emptyLabel` | String | `''` | Empty-state message rendered instead of the chart when the resolved series have no data points |
| `endpointSource` | Object | `null` | Endpoint-bound series/labels (Wave 2, #91): `{ url, method?, params?, responsePath?, labelsPath?, series: [{ name?, path }] }`. `params` use the shared filter-token grammar (`@workspace.datePreset?` rides the dashboard range); an ARRAY payload maps per-item field paths, an OBJECT payload maps parallel arrays; pie-family charts flatten the first series. Exactly one of `dataSource` \| `endpointSource`. |
| `views` | Array | `[]` | In-widget display switcher (Wave 3, #91): `[{ key, label?, series?, valueFormat? }]` — 2+ entries render a pill row; the active view's `series` names filter the rendered cartesian series and its `valueFormat` overrides the widget-level one. Pure display, no arithmetic. |

The `dataSource` OBJECT-form `aggregate` (Wave 3, #91) — `{ groupBy, metric?: 'count'|'sum', sumField?, topN?, otherBucket?, labelResolve?: { register?, schema, labelField?, colorField? } }` — groups the schema's objects via OpenRegister's `/grouped` facet (client-side collection fallback when unavailable), folds the post-`topN` remainder into a translated "Other" slice when `otherBucket: true`, and resolves reference keys to labels/colours through the shared object store (fkResolve pattern). A sibling `drilldown: { route, filterParam }` navigates on segment/bar click with the RAW category key in the query (`/`-prefixed routes are paths, others route names; the Other bucket never navigates).

## Slots

| Slot | Description |
|------|-------------|
| `fallback` | Rendered when the ApexCharts component is not available |

## Refresh wiring

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `widgetId` | String | `''` | Matches `cn:widget:refresh` event-bus events; on a matching id the chart re-queries its `dataSource`. Also exposes a ref-callable `refresh()`. |
