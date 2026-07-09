# registerDashboardWidget

Register (or override) a widget `type` in the shared [`dashboardWidgetRegistry`](./dashboard-widget-registry.md).

```js
import { registerDashboardWidget } from '@conduction/nextcloud-vue'

registerDashboardWidget(type, entry)
```

| Argument | Type | Description |
|----------|------|-------------|
| `type` | `string` | The widget type key (the persisted placement type). An empty / non-string value is a no-op. |
| `entry` | `DashboardWidgetEntry` | The `{ renderer, form, defaultContent, displayName, icon, requires? }` descriptor to register. |

**Last-registration-wins:** registering an existing `type` overwrites the prior entry. When an override occurs and `NODE_ENV !== 'production'`, a `console.warn` naming the overwritten type is emitted so accidental double-registration surfaces in development.

This is the function each built-in widget's `index.js` calls as an import-time side effect. See [`dashboardWidgetRegistry`](./dashboard-widget-registry.md) for the entry shape, the self-registration pattern, and the registration policy.
