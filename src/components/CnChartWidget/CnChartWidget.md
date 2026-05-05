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
