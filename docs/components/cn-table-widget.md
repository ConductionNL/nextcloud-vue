# CnTableWidget

Compact data table with a card wrapper, title header, and optional "View all" footer link. Supports two data modes: external (pass `rows` directly) or self-fetch (provide `register` + `schemaId` to fetch from the OpenRegister API).

**Wraps**: CnDataTable

## Usage

```vue
<!-- External data mode -->
<CnTableWidget
  title="Related Skills"
  :rows="skillRows"
  :columns="[
    { key: 'name', label: 'Name' },
    { key: 'level', label: 'Level' },
  ]"
  :limit="5"
  :view-all-route="{ name: 'Skills' }"
  :row-click-route="(row) => ({ name: 'SkillDetail', params: { id: row.id } })" />

<!-- Self-fetch mode (fetches from OpenRegister) -->
<CnTableWidget
  title="Documents"
  :register="9"
  :schema-id="42"
  :limit="5"
  :columns="docColumns"
  :view-all-route="{ name: 'Documents' }" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Widget title shown in the card header with a total count badge |
| `rows` | Array | `null` | External row data. When provided, no API calls are made |
| `columns` | Array | `[]` | Column definitions: `[{ key, label, sortable? }]` |
| `register` | String \| Number | `null` | OpenRegister register ID for self-fetch mode |
| `schemaId` | String \| Number | `null` | OpenRegister schema ID for self-fetch mode |
| `limit` | Number | `0` | Maximum rows to display (`0` = unlimited). When total exceeds limit, a "View all" link appears |
| `viewAllRoute` | Object | `null` | Vue Router route for the "View all" footer link |
| `rowClickRoute` | Function | `null` | Function `(row) => route` for row click navigation |
| `viewAllLabel` | String | `'View all'` | "View all" link label |
| `emptyText` | String | `'No data available'` | Empty state message |
