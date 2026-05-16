Grid layout (default) — items flow in a responsive auto-fit grid:

```vue
<CnDetailGrid :items="[
  { label: 'ID', value: 'INV-2024-001' },
  { label: 'Status', value: 'Active' },
  { label: 'Created', value: '2024-03-15' },
  { label: 'Owner', value: 'Jane Smith' },
  { label: 'Amount', value: '€ 1.250,00' },
  { label: 'Due date', value: '2024-04-30' },
]" />
```

Horizontal layout — label on the left, value on the right:

```vue
<CnDetailGrid
  layout="horizontal"
  :items="[
    { label: 'Application name', value: 'Open Register' },
    { label: 'Version', value: '0.3.1' },
    { label: 'Environment', value: 'Production' },
    { label: 'Last deploy', value: '2024-03-10 14:22' },
  ]" />
```

Custom slot content — override a value with a component:

```vue
<CnDetailGrid :items="[
  { label: 'Name', value: 'Project Alpha' },
  { label: 'Status' },
  { label: 'Tags' },
]">
  <template #item-1>
    <CnStatusBadge label="Active" variant="success" />
  </template>
  <template #item-2>
    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
      <CnStatusBadge label="frontend" variant="info" size="small" />
      <CnStatusBadge label="vue" variant="primary" size="small" />
      <CnStatusBadge label="urgent" variant="error" size="small" />
    </div>
  </template>
</CnDetailGrid>
```

Fixed columns — pin to an exact number instead of auto-fit:

```vue
<CnDetailGrid
  :columns="2"
  :items="[
    { label: 'First name', value: 'John' },
    { label: 'Last name', value: 'Doe' },
    { label: 'Email', value: 'john@example.com' },
    { label: 'Phone', value: '+31 6 12 34 56 78' },
  ]" />
```

Layout tuning — narrow `minItemWidth` for compact grids; wider `labelWidth` for long labels; no accent border:

```vue
<CnDetailGrid
  layout="horizontal"
  :min-item-width="180"
  :label-width="200"
  :accent="false"
  :items="[
    { label: 'Registration number', value: 'KVK-12345678' },
    { label: 'VAT identification', value: 'NL123456789B01' },
    { label: 'Founded', value: '2019' },
  ]" />
```

Empty state — custom message via the `empty` slot when `items` is empty:

```vue
<CnDetailGrid :items="[]" empty-label="No details available yet.">
  <template #empty>
    <span style="color: var(--color-text-maxcontrast); font-style: italic;">
      No details have been filled in yet.
    </span>
  </template>
</CnDetailGrid>
```

## Additional props

| Prop | Type | Default | Description |
|---|---|---|---|
| `minItemWidth` | `Number` | `250` | Minimum item width (px) for the auto-fit grid. Only applies when `columns` is `0` and `layout` is `'grid'` |
| `labelWidth` | `Number` | `150` | Minimum label width (px) in horizontal mode |
| `accent` | `Boolean` | `true` | Show a primary-color left border on each item |
| `emptyLabel` | `String` | `'No details available'` | Text shown when `items` is empty and the `empty` slot is not used |

## Slots

| Slot | Scope | Description |
|---|---|---|
| `empty` | — | Custom empty state, shown when `items` is empty and no default slot content is provided |
| `item-{index}` | `{ item, index }` | Override the value cell for a specific item |
| `label-{index}` | `{ item, index }` | Override the label cell for a specific item |
| `item-actions-{index}` | `{ item, index }` | Add action buttons after the value for a specific item |
| default | — | Append extra items after the data-driven ones |

## Integration props (AD-18)

| Prop | Default | Description |
|---|---|---|
| `referenceContext` (`reference-context`) | `null` | Object context `{ register, schema, objectId }` forwarded to the integration single-entity widget rendered for items that declare a `referenceType`. Optional. |
