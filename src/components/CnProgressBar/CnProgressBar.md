Basic — counts auto-calculate percentages from the total:

```vue
<CnProgressBar :items="[
  { key: 'simple', label: 'Simple', count: 50, variant: 'success' },
  { key: 'medium', label: 'Medium', count: 30, variant: 'warning' },
  { key: 'complex', label: 'Complex', count: 20, variant: 'error' },
]" />
```

Show percentage — display `%` instead of raw count:

```vue
<CnProgressBar
  :show-percentage="true"
  :items="[
    { key: 'done', label: 'Completed', count: 72, variant: 'success' },
    { key: 'active', label: 'In progress', count: 18, variant: 'primary' },
    { key: 'todo', label: 'Pending', count: 10, variant: 'default' },
  ]" />
```

Explicit percentages — skip auto-calculation with `item.percentage`:

```vue
<CnProgressBar
  :show-percentage="true"
  :items="[
    { key: 'cpu', label: 'CPU', percentage: 72, variant: 'warning' },
    { key: 'mem', label: 'Memory', percentage: 45, variant: 'success' },
    { key: 'disk', label: 'Disk', percentage: 88, variant: 'error' },
  ]" />
```

Dynamic variant — function resolves color based on value:

```vue
<CnProgressBar
  :show-percentage="true"
  :items="[
    {
      key: 'load',
      label: 'Server load',
      percentage: 82,
      variant: ({ percentage }) => percentage > 80 ? 'error' : percentage > 60 ? 'warning' : 'success',
    },
    {
      key: 'mem',
      label: 'Memory',
      percentage: 55,
      variant: ({ percentage }) => percentage > 80 ? 'error' : percentage > 60 ? 'warning' : 'success',
    },
  ]" />
```

Rounded corners — enabled by default (`rounded` prop); set to `false` for square-cornered tracks:

```vue
<div style="display: flex; flex-direction: column; gap: 16px;">
  <div>
    <p style="font-size: 12px; margin-bottom: 4px; color: var(--color-text-maxcontrast);">rounded (default)</p>
    <CnProgressBar :items="[
      { key: 'a', label: 'Tasks done', count: 70, variant: 'success' },
      { key: 'b', label: 'Remaining', count: 30, variant: 'default' },
    ]" />
  </div>
  <div>
    <p style="font-size: 12px; margin-bottom: 4px; color: var(--color-text-maxcontrast);">not rounded</p>
    <CnProgressBar :rounded="false" :items="[
      { key: 'a', label: 'Tasks done', count: 70, variant: 'success' },
      { key: 'b', label: 'Remaining', count: 30, variant: 'default' },
    ]" />
  </div>
</div>
```

Tooltips and custom bar height:

```vue
<CnProgressBar
  :bar-height="12"
  :items="[
    { key: 'api', label: 'API queries', count: 240, variant: 'primary', tooltip: 'REST API endpoint hits' },
    { key: 'db', label: 'DB queries', count: 180, variant: 'info', tooltip: 'Direct database operations' },
    { key: 'cache', label: 'Cache hits', count: 80, variant: 'success', tooltip: 'Served from cache' },
  ]" />
```
