Stack layout — horizontal stat blocks in a vertical list:

```vue
<CnStatsPanel
  :sections="[
    {
      id: 'overview',
      title: 'Overview',
      type: 'stats',
      layout: 'stack',
      items: [
        { title: 'Total objects', count: 4821, variant: 'primary' },
        { title: 'Published', count: 4200, variant: 'success' },
        { title: 'Draft', count: 421, variant: 'warning' },
        { title: 'Archived', count: 200, variant: 'default' },
      ],
    },
  ]" />
```

Grid layout — KPI grid inside a section:

```vue
<CnStatsPanel
  :sections="[
    {
      id: 'kpis',
      title: 'Key metrics',
      type: 'stats',
      layout: 'grid',
      columns: 2,
      items: [
        { title: 'Schemas', count: 12, variant: 'primary' },
        { title: 'Registers', count: 3, variant: 'info' },
        { title: 'Users', count: 28, variant: 'success' },
        { title: 'API calls', count: 15240, variant: 'default' },
      ],
    },
  ]" />
```

Multiple sections:

```vue
<CnStatsPanel
  :sections="[
    {
      id: 'data',
      title: 'Data',
      type: 'stats',
      layout: 'stack',
      items: [
        { title: 'Objects', count: 1842 },
        { title: 'Schemas', count: 7 },
      ],
    },
    {
      id: 'activity',
      title: 'Activity',
      type: 'stats',
      layout: 'stack',
      items: [
        { title: 'Created today', count: 12, variant: 'success' },
        { title: 'Updated today', count: 45, variant: 'primary' },
      ],
    },
  ]" />
```

Loading state:

```vue
<CnStatsPanel :sections="[]" :loading="true" />
```
