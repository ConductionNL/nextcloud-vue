# CnLeafMountHost

Micro-frontend **mount hand-off** for a `renderMode: 'mount'` integration leaf (openregister#2127, ADR-066).

The host surfaces — [CnObjectSidebar](./cn-object-sidebar.md), [CnDetailPage](./cn-detail-page.md), [CnDashboardPage](./cn-dashboard-page.md) — render this wrapper **instead of** `<component :is="provider.tab / widget">` when a resolved integration provider declares `renderMode: 'mount'`. It owns a bare, host-owned `<div>` and calls the leaf's `mount(el, props)` against it; the leaf then instantiates its **own** framework instance rooted at that element (e.g. a Vue 3 `createApp(...).mount(el)`).

Because the DOM element is the neutral hand-off boundary, a leaf built against a **different Vue major** than the host still renders — this is the escape hatch that fixes a Vue-3 leaf blanking under a Vue-2.7 host.

## Why

`<component :is="...">` interprets a component under the host's own Vue runtime. A Vue-3-compiled SFC crashes under the Vue-2.7 renderer (`TypeError: reading '<prop>' of undefined`, blank tab body). The mount hand-off sidesteps the host renderer entirely: the host owns only the element and its lifecycle, the leaf owns the framework instance inside it.

## Lifecycle contract

- **Mount** — `provider.mount(el, props)` is called when the surface becomes visible. A sidebar tab passes `:active="activeTab === provider.id"` so the leaf is **lazy**: its framework instance is not created until the user opens the tab.
- **Unmount** — `provider.unmount(el)` is called before the element is removed: on tab hide, on host teardown (`beforeDestroy`), and before every re-mount.
- **Re-mount on object change** — when the bound object identity (`register` / `schema` / `objectId`) changes while the surface stays visible, the host does a full `unmount(el)` then `mount(el, newProps)` rather than prop diffing, because it cannot push new props into the leaf's own reactive tree. A leaf therefore reads its context from the `props` passed at mount.
- **Error isolation** — a throwing `mount`/`unmount` is caught, logged, and confined to this container's inline error state (or the `#error` slot). One leaf's failure never blanks the sidebar, the detail page, the dashboard, or a sibling leaf.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `provider` | Object | — (required) | The mount-mode provider descriptor from the registry. Must carry `mount(el, props)` and `unmount(el)` functions. Resolve it via `useIntegrationRegistry().getById(id)`. |
| `mountProps` | Object | `{}` | Context forwarded verbatim to `provider.mount(el, props)` — the same shape an SFC widget/tab receives (`{ register, schema, objectId, surface, integrationContext, … }`). A change to `register`/`schema`/`objectId` triggers a re-mount. |
| `active` | Boolean | `true` | Whether the hosting surface is visible. A sidebar tab passes `activeTab === provider.id` for lazy mount; always-visible widget surfaces leave the default. |
| `errorLabel` | String | `t('nextcloud-vue', 'This section could not be loaded.')` | Pre-translated label for the default inline error state. |

## Slots

| Slot | Bindings | Description |
|------|----------|-------------|
| `error` | `{ error, provider }` | Inline error surface shown when the leaf's mount throws. Replaces the default `errorLabel` text. |

## Usage

You rarely mount this directly — the three host surfaces wire it in automatically when a provider is `renderMode: 'mount'`. Direct use:

```vue
<CnLeafMountHost
  :provider="provider"
  :active="activeTab === provider.id"
  :mount-props="{ register, schema, objectId, surface: 'single-entity' }" />
```

## The leaf side

A leaf app exposes the mount pair from its init bundle and registers it:

```js
import { createApp } from 'vue'
import AgentChatTab from './AgentChatTab.vue'

// One framework instance per element (a leaf may be mounted into several).
const apps = new WeakMap()

OCA.OpenRegister.integrations.register({
  id: 'hermiq-agent',
  label: t('hermiq', 'Agent'),
  icon: 'RobotOutline',
  renderMode: 'mount',
  mount(el, props) {
    const app = createApp(AgentChatTab, { ...props })
    app.mount(el)
    apps.set(el, app)
  },
  unmount(el) {
    const app = apps.get(el)
    if (app) { app.unmount(); apps.delete(el) }
  },
})
```

`renderMode` / `mount` / `unmount` travel as a validated pair (see the [Pluggable Integration Registry](../integrations/registry.md) section): supplying one half of the mount pair without the other is rejected at registration. A leaf MAY also keep an SFC `tab` + `widget` pair alongside `mount` as a same-major fast path.

## See also

- [CnObjectSidebar](./cn-object-sidebar.md), [CnDetailPage](./cn-detail-page.md), [CnDashboardPage](./cn-dashboard-page.md) — the host surfaces.
- [useIntegrationRegistry](../utilities/composables/use-integration-registry.md) — resolves providers and their render mode.
