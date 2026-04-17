# CnInfoWidget

Renders label-value pairs in a responsive CSS grid. Supports two modes: manual (provide a `fields` array) or auto-generated from a JSON Schema object + data pair. Used in dashboard and detail page layouts to display entity metadata.

## Usage

```vue
<!-- Manual fields -->
<CnInfoWidget
  :fields="[
    { label: 'Email', value: 'info@example.com' },
    { label: 'Phone', value: '+31 6 12345678' },
    { label: 'Status', value: 'Active' },
  ]"
  :columns="2" />

<!-- Auto-generated from JSON Schema -->
<CnInfoWidget
  :object="contact"
  :schema="contactSchema"
  :columns="3"
  :include-fields="['name', 'email', 'status']"
  :exclude-fields="['password']" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fields` | Array | `null` | Manual field definitions: `[{ label, value }]`. Takes precedence over `object` + `schema` |
| `object` | Object | `null` | Data object for auto-generation mode |
| `schema` | Object | `null` | JSON Schema for auto-generation mode — property titles become labels |
| `columns` | Number | `2` | Number of columns in the grid layout |
| `includeFields` | Array | `null` | Allowlist of property keys to include (auto-generation mode only) |
| `excludeFields` | Array | `[]` | Blocklist of property keys to exclude (auto-generation mode only) |

### Value formatting

In auto-generation mode, values are formatted automatically:

| Type | Output |
|------|--------|
| `null` / `undefined` | `—` (em-dash) |
| Array | Comma-separated string |
| Object | `JSON.stringify(value)` |
| Boolean | `'Yes'` / `'No'` |
| Other | `String(value)` |
