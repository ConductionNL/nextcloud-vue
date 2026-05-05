CnChartWidget wraps ApexCharts for use inside dashboard widget slots. Consuming apps must install `apexcharts` and `vue-apexcharts` as dependencies. The styleguide environment includes these packages, so examples render live.

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

## Slots

| Slot | Description |
|------|-------------|
| `fallback` | Rendered when the ApexCharts component is not available |
