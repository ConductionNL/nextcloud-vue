# CnChartWidget

ApexCharts wrapper for dashboard and detail page widgets. Supports area, line, bar, pie, donut, and radialBar chart types with Nextcloud-themed defaults. The chart library is a peer dependency — consuming apps must install `apexcharts` and `vue-apexcharts`.

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
