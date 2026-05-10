# CnStatsBlockWidget

Manifest-driven dashboard widget that pulls a count from OpenRegister's GraphQL endpoint and forwards it to [`CnStatsBlock`](./cn-stats-block.md) for rendering. Mounted automatically by [`CnDashboardPage`](./cn-dashboard-page.md) when a widget definition has `type: 'stats-block'`.

## Manifest example

```json
{
  "id": "minutes-in-review",
  "type": "stats-block",
  "title": "Notulen ter goedkeuring",
  "iconClass": "icon-file",
  "props": { "countLabel": "notulen", "variant": "warning" },
  "dataSource": {
    "register": "decidesk",
    "schema": "minutes",
    "filter": { "lifecycle": "review" },
    "aggregate": "count"
  }
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dataSource` | `object` | required | Manifest dataSource block. See [`useDataSource`](../utilities/composables/use-data-source.md). |
| `title` | `string` | `''` | Block title. |
| `countLabel` | `string` | `''` | Label next to the count. |
| `variant` | `'default'\|'primary'\|'success'\|'warning'\|'error'` | `'default'` | Color variant. |
| `showZeroCount` | `boolean` | `true` | Show `0` instead of the empty-label fallback. |
| `horizontal` | `boolean` | `false` | Horizontal layout. |
| `route` | `object\|null` | `null` | Vue-router location; when set, the inner card becomes a `<router-link>`. |

## Notes

- Designed only for the manifest path. If you already have a count number in JS, mount [`CnStatsBlock`](./cn-stats-block.md) directly.
- Errors from the underlying GraphQL request fall back to `count = 0`. The dashboard never blanks on a transport failure.
