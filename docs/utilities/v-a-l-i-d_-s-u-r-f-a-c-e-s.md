# VALID_SURFACES

Enum of rendering surfaces understood by the [pluggable integration registry](../guides/integrations.md).

## Value

```js
import { VALID_SURFACES } from '@conduction/nextcloud-vue'

// ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
```

| Surface | Where it renders | Default widget override key |
|---------|------------------|------------------------------|
| `user-dashboard` | User's personal Nextcloud dashboard widgets | `widgetCompact` |
| `app-dashboard` | App-level dashboard pages (e.g. `CnDashboardPage`) | _(none — uses `widget`)_ |
| `detail-page` | Per-object detail surfaces (e.g. `CnDetailPage`) | `widgetExpanded` |
| `single-entity` | Inline rendering of a `referenceType` schema property | `widgetEntity` |

## Surface fallback (AD-19)

`registry.resolveWidget(id, surface)` picks the surface-specific override when present; otherwise it returns the main `widget` with `surface` passed as a prop. Adding a future surface (e.g. `email-digest`, `printed-pdf`, `mobile-card`) requires zero re-registration from existing integrations — they keep working via fallback.

## See also

- [Pluggable integration registry guide](../guides/integrations.md)
- [`integrations.resolveWidget`](./integrations.md)
- [`useIntegrationRegistry`](./composables/use-integration-registry.md)
