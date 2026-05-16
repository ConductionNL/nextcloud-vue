# useIntegrationRegistry

Vue 2.7 composable that exposes a reactive snapshot of the [pluggable integration registry](../../guides/integrations.md). Backs `CnObjectSidebar`, `CnDashboardPage`, and `CnDetailPage` — components re-render automatically when a consuming app registers or unregisters an integration.

## Signature

```js
import { useIntegrationRegistry } from '@conduction/nextcloud-vue'

const { integrations, getById, resolveWidget, registry } = useIntegrationRegistry()
```

| Argument | Type | Description |
|----------|------|-------------|
| `registry` | `object?` | Override registry instance. Defaults to the global singleton — pass `createIntegrationRegistry()` to isolate registrations in tests. |

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `integrations` | `ComputedRef<object[]>` | Reactive snapshot of registered providers, sorted by `order` ascending then `id`. |
| `getById` | `(id: string) => object \| null` | Look up a single provider by id. |
| `resolveWidget` | `(id: string, surface: string) => object \| null` | Pick the widget component for a surface, applying the AD-19 fallback rule. |
| `registry` | `object` | The underlying registry (escape hatch for advanced cases). |

## Surface fallback (AD-19)

`resolveWidget(id, surface)` resolves to:

1. The surface-specific override (`widgetCompact` for `user-dashboard`, `widgetExpanded` for `detail-page`, `widgetEntity` for `single-entity`) when present.
2. Otherwise the main `widget`, with the `surface` prop passed through so the component can branch internally.

## Lifecycle

The composable subscribes via `registry.onChange()` on mount and unsubscribes on `onBeforeUnmount`. The snapshot updates synchronously when a registration arrives so Vue's reactivity picks up the change in the next tick.

## Example

```vue
<template>
  <ul>
    <li v-for="entry in integrations" :key="entry.id">
      <component :is="entry.tab" :register="register" :schema="schema" :object-id="objectId" />
    </li>
  </ul>
</template>

<script>
import { useIntegrationRegistry } from '@conduction/nextcloud-vue'

export default {
  props: ['register', 'schema', 'objectId'],
  setup() {
    const { integrations, resolveWidget } = useIntegrationRegistry()
    return { integrations, resolveWidget }
  },
}
</script>
```

## See also

- [Pluggable integration registry guide](../../guides/integrations.md)
- [`CnObjectSidebar`](../../components/cn-object-sidebar.md)
- [`CnDashboardPage`](../../components/cn-dashboard-page.md)
- [`CnDetailPage`](../../components/cn-detail-page.md)
