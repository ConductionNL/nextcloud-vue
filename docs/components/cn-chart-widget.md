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

The dispatcher forwards `props.chartKind` as the apex `type` and passes through `series`, `categories`, `labels`, `options`, `colors`, `toolbar`, `legend`, `height`, `width`, `unavailableLabel`. The reserved `dataSource` field (`{ url }` OR `{ register, schema, groupBy, aggregate }`) is round-tripped through manifest validators today; the resolver lands in a follow-up cycle.

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

### Slots

| Slot | Description |
|------|-------------|
| `fallback` | Content rendered when ApexCharts is not available |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnChartWidget.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnChartWidget/CnChartWidget.vue) and update automatically whenever the component changes.

<GeneratedRef />
