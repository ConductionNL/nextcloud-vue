String value — plain text with optional truncation:

```vue
<div style="display: flex; flex-direction: column; gap: 8px;">
  <CnCellRenderer value="Short text" :property="{ type: 'string' }" />
  <CnCellRenderer
    value="A very long description that exceeds the truncation limit and will be cut off with an ellipsis on hover"
    :property="{ type: 'string' }"
    :truncate="40" />
</div>
```

Boolean — renders a check icon for `true`, dash for `false`:

```vue
<div style="display: flex; gap: 24px; align-items: center;">
  <div>
    <span style="font-size: 12px; color: var(--color-text-maxcontrast);">true</span>
    <CnCellRenderer :value="true" :property="{ type: 'boolean' }" />
  </div>
  <div>
    <span style="font-size: 12px; color: var(--color-text-maxcontrast);">false</span>
    <CnCellRenderer :value="false" :property="{ type: 'boolean' }" />
  </div>
</div>
```

Enum — renders as a CnStatusBadge:

```vue
<div style="display: flex; gap: 8px; align-items: center;">
  <CnCellRenderer
    value="open"
    :property="{ type: 'string', enum: ['open', 'closed', 'pending'] }" />
  <CnCellRenderer
    value="closed"
    :property="{ type: 'string', enum: ['open', 'closed', 'pending'] }" />
  <CnCellRenderer
    value="pending"
    :property="{ type: 'string', enum: ['open', 'closed', 'pending'] }" />
</div>
```

Array — joined list or dash when empty:

```vue
<div style="display: flex; flex-direction: column; gap: 8px;">
  <CnCellRenderer :value="['tag1', 'tag2', 'tag3']" :property="{ type: 'array' }" />
  <CnCellRenderer :value="[]" :property="{ type: 'array' }" />
</div>
```

Date/UUID — formatted with monospace styling:

```vue
<div style="display: flex; flex-direction: column; gap: 8px;">
  <CnCellRenderer value="2024-03-15T10:30:00Z" :property="{ type: 'string', format: 'date-time' }" />
  <CnCellRenderer value="a1b2c3d4-e5f6-7890-abcd-ef1234567890" :property="{ type: 'string', format: 'uuid' }" />
</div>
```
