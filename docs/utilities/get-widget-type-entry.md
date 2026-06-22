# getWidgetTypeEntry

Look up a single widget type entry in the shared [`dashboardWidgetRegistry`](./dashboard-widget-registry.md).

```js
import { getWidgetTypeEntry } from '@conduction/nextcloud-vue'

const entry = getWidgetTypeEntry(type)
```

| Argument | Type | Description |
|----------|------|-------------|
| `type` | `string` | The widget type key. |

## Return value

| Type | Description |
|------|-------------|
| `DashboardWidgetEntry \| null` | The registry entry, or `null` when the type is unknown so the caller can fall back gracefully. |

[`CnWidgetGrid`](../components/cn-widget-grid.md) calls this to resolve a placement's renderer by its `widgetKey`. See [`dashboardWidgetRegistry`](./dashboard-widget-registry.md) for the entry shape and the resolution order.
