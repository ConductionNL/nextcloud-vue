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

Column formatter — when a `formatter` id is set and resolves in the injected
`cnFormatters` registry (provided by `CnAppRoot`), the cell renders
`cnFormatters[formatter](value, row, property)` as text, overriding the
type-aware paths above. `CnDataTable` passes `:formatter="col.formatter"` and
`:row="row"` for schema columns; for manual columns it runs the value through
`formatCell(row, col)`. Unknown ids / a missing registry / a throwing formatter
fall back to the normal rendering. See `docs/migrating-to-manifest.md` →
"Column formatters" for the consumer-side wiring (`src/formatters.js` +
`:formatters` on `CnAppRoot`).

```vue
<CnCellRenderer
  value="lead.created"
  :row="{ trigger: 'lead.created', name: 'Welcome flow' }"
  :property="{ type: 'string' }"
  formatter="automationTrigger" />
```

> The example above needs an ancestor that `provide`s `cnFormatters` (e.g.
> `cnFormatters: { automationTrigger: v => ({ 'lead.created': 'Lead created' }[v] ?? v) }`);
> standalone (no provider) it falls back to rendering the raw value.

Column widget — `widget="badge"` is built in (renders `CnStatusBadge`, `widgetProps.variant` selects the colour); any other id resolves against the app's `cellWidgets` registry (`CnAppRoot`'s `cellWidgets` prop → `cnCellWidgets`), and that component receives `{ value, row, property, formatted, ...widgetProps }`. `widget` takes precedence over `formatter`; when both are set the widget gets the formatter-shaped value as `formatted`. See `docs/migrating-to-manifest.md` → "Column widgets".

```vue
<div style="display: flex; gap: 12px; align-items: center;">
  <CnCellRenderer value="open" :property="{ type: 'string' }" widget="badge" />
  <CnCellRenderer value="failed" :property="{ type: 'string' }" widget="badge" :widget-props="{ variant: 'error' }" />
</div>
```
