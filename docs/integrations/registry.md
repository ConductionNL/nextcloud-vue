---
sidebar_position: 4
---

# Pluggable integration registry

By the end of this page your app contributes a tab and a widget that appear inside OpenRegister, without OpenRegister knowing your app exists.

OpenRegister exposes a registry on `window.OCA.OpenRegister.integrations`. Your app registers a descriptor at bootstrap. Three surfaces then render it: the per-object tab strip in `CnObjectSidebar`, the widget grid in `CnDashboardPage`, and the object detail in `CnDetailPage`.

Registration is reactive. An app whose bundle loads late still causes mounted components to re-render.

## Register an integration

Call `register()` once, at bootstrap, before you mount Vue:

```js
import CnCalendarTab from './CnCalendarTab.vue'
import CnCalendarCard from './CnCalendarCard.vue'

OCA.OpenRegister.integrations.register({
  id: 'calendar',
  label: t('myapp', 'Meetings'),
  icon: 'Calendar',
  requiredApp: 'calendar',
  order: 10,
  group: 'comms',
  tab: CnCalendarTab,
  widget: CnCalendarCard,
  defaultSize: { w: 3, h: 3 },
})
```

Open any object in OpenRegister. Your tab is in the sidebar strip, ordered by `order`. If it is not, check the browser console: `register()` throws on a malformed descriptor rather than failing quietly.

## Registration shape

`id` and `label` are always required. In the default render mode, `tab` and `widget` are required too.

| Field | Type | Default | What it does |
|---|---|---|---|
| `id` | string | required | Stable provider id. Matches the PHP side. |
| `label` | string | required | Human-readable label, already translated. |
| `icon` | string | `null` | MDI icon name. |
| `requiredApp` | string | `null` | Nextcloud app id this integration needs. |
| `order` | number | `100` | Sort hint, ascending, then by `id`. |
| `group` | string | `null` | `core`, `comms`, `docs`, `workflow` or `external`. |
| `requiresPermission` | string | `null` | Permission the viewer must hold. |
| `referenceType` | string | `null` | Marker that lets a schema property target this integration. |
| `tab` | component | required | Sidebar tab component. |
| `widget` | component | required | Dashboard and detail widget component. |
| `widgetCompact` | component | `null` | Override for the `user-dashboard` surface. |
| `widgetExpanded` | component | `null` | Override for the `detail-page` surface. |
| `widgetEntity` | component | `null` | Override for the `single-entity` surface. |
| `defaultSize` | object | `null` | Default grid size, `{ w, h }`. |
| `surfaces` | string[] | every surface | Explicit surface allowlist. |
| `available` | boolean | `null` | Backing-app availability hint. `null` means resolve it from capabilities. |
| `accentColor` | string | `null` | Brand accent hex for the tab and header tint. |
| `appName` | string | `label` | Backing-app name used in the "not available" empty state. |
| `docsUrl` | string | derived | Setup docs for the empty state. |
| `offlineConfig` | object | `null` | Opaque config bag forwarded to your components. |
| `renderMode` | string | `'component'` | `'component'` or `'mount'`. See below. |
| `mount` / `unmount` | function | `null` | DOM hand-off pair. Required together in `mount` mode. |

`register()` throws a `TypeError` when `id` or `label` is missing, and when `tab` or `widget` is missing in component mode. Those are programming errors, so they fail loudly at bootstrap rather than producing an empty tab later.

## Surfaces, and what renders where

There are four surfaces:

| Surface | Where it renders |
|---|---|
| `user-dashboard` | The user's own Nextcloud dashboard |
| `app-dashboard` | `CnDashboardPage` inside an app |
| `detail-page` | `CnDetailPage` for a single object |
| `single-entity` | One referenced entity, inline in a form or detail grid |

You do not need a component per surface. A surface without its own override falls back to `widget`, which receives `surface` as a prop. Declare `widgetCompact`, `widgetExpanded` or `widgetEntity` only where a surface genuinely needs different rendering.

Resolve a surface yourself with `resolveWidget(id, surface)`, which applies that fallback for you.

## Two render modes

`renderMode: 'component'` is the default. Your `tab` and `widget` are single-file components, interpreted by the host's own Vue runtime. Use this unless you have a reason not to.

`renderMode: 'mount'` hands your integration a bare DOM element instead:

```js
OCA.OpenRegister.integrations.register({
  id: 'legacy-viewer',
  label: t('myapp', 'Viewer'),
  renderMode: 'mount',
  mount: (el, props) => createMyApp(props).mount(el),
  unmount: (el) => teardown(el),
})
```

This exists so a leaf built against a different Vue major than the host can render its own framework instance. `mount` and `unmount` travel as a pair: supplying one without the other throws in development and is dropped with a warning in production. In `mount` mode `tab` and `widget` become an optional same-major fast path.

## Read the registry in a component

```js
import { useIntegrationRegistry } from '@conduction/nextcloud-vue'

setup() {
  const { integrations, getById, resolveTab, resolveWidget } = useIntegrationRegistry()
  return { integrations, getById, resolveTab, resolveWidget }
}
```

`integrations` is a `ComputedRef<object[]>`, sorted by `order` then `id`, and it updates when a late bundle registers. The underlying registry instance is available as `registry` if you need `unregister`, `has` or `onChange`.

## Survive a bootstrap-order race

If your bundle can load before OpenRegister's, install a stub before you call `register()`. OpenRegister replays the queue when its own bundle initialises:

```js
window.OCA = window.OCA || {}
window.OCA.OpenRegister = window.OCA.OpenRegister || {}
window.OCA.OpenRegister.integrations = window.OCA.OpenRegister.integrations || {
  _queue: [],
  register(entry) { this._queue.push(entry) },
}
```

## Registering an id twice

The first registration wins. A duplicate `id` throws in development and warns in production, keeping the first entry.

That is also how you override a built-in: register your own provider under the same id before OpenRegister registers its default.

## Point a schema property at an integration

A schema property carrying `referenceType: '<integration-id>'` renders that integration's `single-entity` widget instead of a plain input or value. `CnFormDialog` and `CnDetailGrid` both honour it, and both forward a `referenceContext` of `{ register, schema, objectId }`.

A consumer slot (`#field-<key>` or `#item-<index>`) still wins over the integration.

## Next

Register your integration at bootstrap, then read [CnIntegrationWidget](../components/cn-integration-widget.md) for the props your widget receives on each surface.
