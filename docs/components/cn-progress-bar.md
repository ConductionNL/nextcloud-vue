---
sidebar_position: 13
---

# CnProgressBar

Labeled horizontal progress bars with variant colors. Renders a list of items as percentage-filled bars, ideal for distribution visualizations such as query complexity, action breakdowns, or status distributions.

**Standalone** component — also available as a `type: 'progress'` section inside [CnStatsPanel](./cn-stats-panel.md).

## When to use

Use CnProgressBar when you need to visualize how values are distributed across categories. Each item gets a label, a value, and a proportional bar fill.

Typical use cases:
- Query complexity distribution (simple / medium / complex)
- Action type breakdown (create / update / delete)
- Resource utilization (CPU / memory / disk)
- Status distribution across items

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | Array | `[]` | Progress bar items (see data shape below) |
| `variant` | String | `'primary'` | Default color variant for all bars. Individual items can override. One of: `'default'`, `'primary'`, `'success'`, `'warning'`, `'error'`, `'info'` |
| `barHeight` | Number | `8` | Height of the progress bar track in pixels |
| `rounded` | Boolean | `true` | Whether to use rounded corners on track and fill |
| `showPercentage` | Boolean | `false` | Show percentage value instead of count |

### Item data shape

```js
{
  key: 'simple',                    // unique key (optional, falls back to index)
  label: 'Simple',                  // display label
  count: 50,                        // numeric value (used to calculate percentage from total)
  total: 500,                       // per-item total (optional — defaults to sum of all counts)
  percentage: 72,                   // explicit percentage (0-100), overrides count and total
  variant: 'success',               // color variant: string or function (see below)
  tooltip: 'Basic text searches',   // hover tooltip text for the label
}
```

**Percentage calculation priority:**
1. `percentage` — used as-is if provided
2. `count / total` — if `total` is set on the item (e.g. count=50, total=500 → 10%)
3. `count / sum(all counts)` — default, proportional to sibling items

## Slots

| Slot | Scoped data | Description |
|------|-------------|-------------|
| `label-{key}` | `{ item }` | Override the label text for a specific item |
| `value-{key}` | `{ item, percentage }` | Override the value display for a specific item |

## Usage

### Basic distribution

```vue
<CnProgressBar :items="[
  { key: 'simple', label: 'Simple', count: 50, variant: 'success' },
  { key: 'medium', label: 'Medium', count: 30, variant: 'warning' },
  { key: 'complex', label: 'Complex', count: 20, variant: 'error' },
]" />
```

### With tooltips and percentage display

```vue
<CnProgressBar
  :items="[
    { key: 'cpu', label: 'CPU', percentage: 72, variant: 'warning', tooltip: 'Current CPU utilization' },
    { key: 'mem', label: 'Memory', percentage: 45, variant: 'success', tooltip: 'Current memory usage' },
    { key: 'disk', label: 'Disk', percentage: 91, variant: 'error', tooltip: 'Storage capacity used' },
  ]"
  show-percentage
  :bar-height="10" />
```

### Inside CnStatsPanel

Use `type: 'progress'` to embed progress bars as a section in CnStatsPanel:

```js
sections: [
  {
    type: 'progress',
    id: 'complexity',
    title: 'Query Complexity',
    items: [
      { key: 'simple', label: 'Simple', count: 50, variant: 'success', tooltip: 'Basic searches' },
      { key: 'medium', label: 'Medium', count: 30, variant: 'warning', tooltip: 'Filtered searches' },
      { key: 'complex', label: 'Complex', count: 20, variant: 'error', tooltip: 'Advanced queries' },
    ],
  },
]
```

Section-level props forwarded to CnProgressBar: `variant`, `barHeight`, `rounded`, `showPercentage`.

### Dynamic variant via function

The `variant` on each item can be a function that receives `{ item, count, total, percentage }` and returns a variant string. Useful for threshold-based coloring:

```vue
<CnProgressBar
  :items="[
    {
      key: 'cpu',
      label: 'CPU',
      percentage: 72,
      variant: ({ percentage }) => percentage >= 90 ? 'error' : percentage >= 70 ? 'warning' : 'success',
      tooltip: 'Current CPU utilization',
    },
    {
      key: 'mem',
      label: 'Memory',
      count: 350,
      total: 500,
      variant: ({ percentage }) => percentage >= 80 ? 'error' : 'info',
    },
  ]"
  show-percentage />
```

### Custom bar height and no rounding

```vue
<CnProgressBar
  :items="items"
  :bar-height="12"
  :rounded="false"
  variant="primary" />
```
