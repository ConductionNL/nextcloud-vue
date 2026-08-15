# integrations

Default singleton instance of the [pluggable integration registry](../guides/integrations.md). OpenRegister attaches this to `window.OCA.OpenRegister.integrations` at bootstrap; consuming Conduction apps call `integrations.register(...)` to expose tabs and widgets that appear in `CnObjectSidebar`, `CnDashboardPage`, and `CnDetailPage`.

For test isolation, import [`createIntegrationRegistry`](./create-integration-registry.md) instead — each call returns a fresh, isolated registry.

## Signature

```js
import { integrations } from '@conduction/nextcloud-vue'

integrations.register({ id, label, tab, widget, /* ... */ })
integrations.list()                  // sorted snapshot
integrations.get('files')            // single entry or null
integrations.has('files')            // boolean
integrations.resolveWidget('files', 'detail-page')
integrations.onChange((snapshot) => { /* ... */ })
integrations.unregister('files')
```

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `register(entry)` | `object \| null` | Normalise and store an integration. Throws on invalid input, on missing `tab`/`widget`, and on duplicate `id` in development (warns + keeps first in production — AD-13). |
| `unregister(id)` | `boolean` | Remove an integration. Returns `true` when something was removed. |
| `list()` | `object[]` | Snapshot sorted by `order` ascending then `id`. |
| `get(id)` | `object \| null` | Single entry by id. |
| `has(id)` | `boolean` | Membership check. |
| `resolveWidget(id, surface)` | `object \| null` | Apply the AD-19 surface fallback rule. |
| `onChange(fn)` | `() => boolean` | Subscribe; returns an unsubscribe function. |

## Entry shape

See the [registration shape](../guides/integrations.md#registration-shape) reference for the full descriptor (id, label, icon, requiredApp, order, group, requiresPermission, referenceType, tab, widget, widgetCompact, widgetExpanded, widgetEntity, defaultSize).

## See also

- [`createIntegrationRegistry`](./create-integration-registry.md) — isolated instances
- [`installIntegrationRegistry`](./install-integration-registry.md) — attach onto `window.OCA.OpenRegister.integrations` and drain queued stubs
- [`useIntegrationRegistry`](./composables/use-integration-registry.md) — Vue reactive wrapper
- [`VALID_SURFACES`](./v-a-l-i-d_-s-u-r-f-a-c-e-s.md) — the surface enum
