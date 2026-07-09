# getDefaultContent

Return a fresh copy of the `defaultContent` blob for a registered widget type from the shared [`dashboardWidgetRegistry`](./dashboard-widget-registry.md).

```js
import { getDefaultContent } from '@conduction/nextcloud-vue'

const content = getDefaultContent(type)
```

| Argument | Type | Description |
|----------|------|-------------|
| `type` | `string` | The widget type key. |

## Return value

| Type | Description |
|------|-------------|
| `object` | A fresh shallow copy of the type's `defaultContent`, or `{}` for unknown types so the caller never has to null-check. |

A shallow copy is returned so a caller mutating the result does not pollute the registry defaults or another caller's content. [`useWidgetForm`](./composables/use-widget-form.md) uses this to seed and merge form state. See [`dashboardWidgetRegistry`](./dashboard-widget-registry.md) for the full registry API.
