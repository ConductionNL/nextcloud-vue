# useIntegrationRegistry

Vue 2.7 composable that exposes a reactive snapshot of the [pluggable integration registry](../../guides/integrations.md). Backs `CnObjectSidebar`, `CnDashboardPage`, and `CnDetailPage` — components re-render automatically when a consuming app registers or unregisters an integration.

## Signature

```js
import { useIntegrationRegistry } from '@conduction/nextcloud-vue'

const { integrations, getById, resolveTab, resolveWidget, registry } = useIntegrationRegistry()
```

| Argument | Type | Description |
|----------|------|-------------|
| `registry` | `object?` | Override registry instance. Defaults to the global singleton — pass `createIntegrationRegistry()` to isolate registrations in tests. |

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `integrations` | `ComputedRef<object[]>` | Reactive snapshot of registered providers, sorted by `order` ascending then `id`. |
| `getById` | `(id: string) => object \| null` | Look up a single provider by id. |
| `resolveTab` | `(id: string) => object \| null` | Resolve the sidebar tab component for an integration id. Lib-owned ids resolve to this bundle's LOCAL component (see [Local resolution](#local-resolution-lib-owned-ids) below); consumer-custom ids resolve via the shared registry's stored `tab`. |
| `resolveWidget` | `(id: string, surface: string) => object \| null` | Pick the widget component for a surface, applying the AD-19 fallback rule. Same local-resolution semantics as `resolveTab`. |
| `registry` | `object` | The underlying registry (escape hatch for advanced cases). |

## Surface fallback (AD-19)

`resolveWidget(id, surface)` resolves to:

1. The surface-specific override (`widgetCompact` for `user-dashboard`, `widgetExpanded` for `detail-page`, `widgetEntity` for `single-entity`) when present.
2. Otherwise the main `widget`, with the `surface` prop passed through so the component can branch internally.

## Local resolution (lib-owned ids)

`@conduction/nextcloud-vue` ships built-in tab/widget components for the canonical built-ins (`files`, `notes`, `tags`, `tasks`, `audit-trail`) and the 19 bespoke leaf integrations (`calendar`, `contacts`, `email`, `talk`, `bookmarks`, `collectives`, `maps`, `photos`, `deck`, `polls`, `shares`, `activity`, `analytics`, `cospend`, `flow`, `forms`, `time-tracker`, `openproject`, `xwiki`). `registerBuiltinIntegrations` and `registerLeafIntegrations` mark their entries with `__libOwned: true`.

For lib-owned ids, `resolveTab` and `resolveWidget` return the component imported by THIS composable's module — i.e. the **rendering bundle's** copy of the component. That keeps the composition-API `setup()` (and any nested `inject()` like `NcButton`'s `useNcFormBox`) bound to the rendering bundle's Vue runtime, sidestepping the dual-runtime trap that occurs when one app loads multiple webpack entries with their own `vue` + `@nextcloud/vue` copies on the same page (e.g. OpenRegister's `main` + `integration-global`).

Consumer-custom registrations (those without `__libOwned`) are resolved through the shared registry's stored component. Those components live in the consumer's own bundle and render under the same Vue, so no mismatch arises.

**Practical rule:** prefer `resolveTab(entry.id)` / `resolveWidget(entry.id, surface)` over reading `entry.tab` / `entry.widget` directly when rendering integration components in a host app — the resolvers do the right thing in both single- and multi-bundle deployments.

## Lifecycle

The composable subscribes via `registry.onChange()` on mount and unsubscribes on `onBeforeUnmount`. The snapshot updates synchronously when a registration arrives so Vue's reactivity picks up the change in the next tick.

## Example

```vue
<template>
  <ul>
    <li v-for="entry in integrations" :key="entry.id">
      <component
        :is="resolveTab(entry.id)"
        :register="register"
        :schema="schema"
        :object-id="objectId" />
    </li>
  </ul>
</template>

<script>
import { useIntegrationRegistry } from '@conduction/nextcloud-vue'

export default {
  props: ['register', 'schema', 'objectId'],
  setup() {
    const { integrations, resolveTab, resolveWidget } = useIntegrationRegistry()
    return { integrations, resolveTab, resolveWidget }
  },
}
</script>
```

## See also

- [Pluggable integration registry guide](../../guides/integrations.md)
- [`CnObjectSidebar`](../../components/cn-object-sidebar.md)
- [`CnDashboardPage`](../../components/cn-dashboard-page.md)
- [`CnDetailPage`](../../components/cn-detail-page.md)
