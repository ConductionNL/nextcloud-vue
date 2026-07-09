# listWidgetTypes

List every registered widget type that has a usable form component, from the shared [`dashboardWidgetRegistry`](./dashboard-widget-registry.md).

```js
import { listWidgetTypes } from '@conduction/nextcloud-vue'

const types = listWidgetTypes() // → ['text', 'image', 'link', …]
```

## Return value

| Type | Description |
|------|-------------|
| `string[]` | The registered type keys whose entry has a non-null `form`. |

The [`CnAddWidgetModal`](../components/cn-add-widget-modal.md) type picker calls this. Renderer-only types (entries with a `null`/`undefined` `form`) are excluded so the user is never offered a type they cannot configure.

See [`dashboardWidgetRegistry`](./dashboard-widget-registry.md) for the full registry API.
