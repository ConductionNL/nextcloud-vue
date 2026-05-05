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
