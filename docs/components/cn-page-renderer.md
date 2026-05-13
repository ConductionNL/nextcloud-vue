# CnPageRenderer

JSON-driven page dispatcher. Mounted inside `<router-view>`, CnPageRenderer reads the manifest, finds the page definition whose `id` matches the current route name (`$route.name === page.id`), and renders the appropriate component by dispatching on `page.type`.

Page types are resolved via the `pageTypes` registry. The library ships a built-in registry ([`defaultPageTypes`](../utilities/default-page-types.md) — `index`, `detail`, `dashboard`) and consumers extend it by passing a merged map. The `custom` type is special: it resolves `page.component` against the `customComponents` registry rather than `pageTypes`.

Each entry in `pageTypes` is wrapped in `defineAsyncComponent`, so apps using only a subset pay no bundle cost for the others (notably the GridStack-backed `dashboard`).

`manifest`, `customComponents`, `pageTypes`, and `translate` are injected from [`CnAppRoot`](./cn-app-root.md) by default; each can also be passed as props for standalone use. **Props always win over inject.**

## Usage

### Inside CnAppRoot via vue-router

```js
// router.js
import { CnPageRenderer } from '@conduction/nextcloud-vue'
const routes = manifest.pages.map((page) => ({
  name: page.id,         // CnPageRenderer matches by $route.name === page.id
  path: page.route,
  component: CnPageRenderer,
}))
```

```vue
<!-- App.vue (under CnAppRoot's <router-view />) -->
<CnPageRenderer />
```

### Standalone (props instead of inject)

```vue
<CnPageRenderer
  :manifest="manifest"
  :custom-components="customComponents"
  :page-types="pageTypes" />
```

### Manifest example

```json
{
  "pages": [
    {
      "id": "decisions-index",
      "route": "/decisions",
      "type": "index",
      "title": "Decisions",
      "config": { "register": "decisions", "schema": "decision", "columns": ["title", "status"] }
    },
    {
      "id": "decisions-detail",
      "route": "/decisions/:id",
      "type": "detail",
      "title": "Decision",
      "config": { "register": "decisions", "schema": "decision" },
      "headerComponent": "DecisionHeader",
      "actionsComponent": "DecisionActions",
      "slots": { "footer": "DecisionFooter" }
    },
    {
      "id": "settings",
      "route": "/settings",
      "type": "custom",
      "title": "Settings",
      "component": "SettingsPage"
    }
  ]
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `manifest` | `Object \| null` | `null` | Manifest. Falls back to injected `cnManifest`. |
| `customComponents` | `Object \| null` | `null` | Registry for `type: "custom"` pages and slot-override names. Falls back to injected `cnCustomComponents` (then `{}`). |
| `translate` | `Function \| null` | `null` | Falls back to injected `cnTranslate`. Reserved for future use; the renderer doesn't currently call it directly. |
| `pageTypes` | `Object \| null` | `null` | Map of `pages[].type` → Vue component. Falls back to injected `cnPageTypes`, then to the library's [`defaultPageTypes`](../utilities/default-page-types.md). |

## Page resolution

| Property | Behaviour |
|----------|-----------|
| `page.id` | Matched against `$route.name`. The instance's `$options.name` is set to `CnPageRenderer:<id>` for cleaner Vue devtools / stack traces |
| `page.type` | Looked up in `pageTypes`. Special-case: `"custom"` resolves `page.component` in `customComponents` instead |
| `page.title` / `page.description` / `page.icon` | Forwarded as props onto the resolved component (defaults — `page.config.*` and `$route.params.*` still win on collision). Lets a manifest entry render its header from a single top-level field without duplicating into `config`. |
| `page.config` | Spread as props onto the resolved component. Overrides any collision with the top-level `title`/`description`/`icon` defaults above. |
| `page.slots` | `{ slotName: registryName }` map — each entry resolves a `customComponents` entry and mounts it inside the corresponding scoped slot |
| `page.headerComponent` | Sugar for `slots.header` (sugar wins when both are set) |
| `page.actionsComponent` | Sugar for `slots.actions` (sugar wins when both are set) |
| `page.sidebar` | `{ show?: boolean }` object — sibling of `config`. Drives a reactive `cnPageSidebarVisible` provide and a CSS hook class. See [Per-page sidebar visibility](#per-page-sidebar-visibility) below. |
| `page.sidebarComponent` | Registry name (string). Resolved against `customComponents` and pushed onto a reactive `cnPageSidebarComponent` provide so `CnAppRoot`'s `#sidebar` slot mounts it as default content for this page only. See [Per-page sidebar component](#per-page-sidebar-component) below. |

When `page.type` (or a registered `customComponents` name) is missing, the renderer logs `console.warn` once and mounts nothing rather than crashing.

## Per-page sidebar visibility

Each page entry MAY declare a top-level `sidebar` object (sibling of `config`) that gates the host App's `#sidebar` slot for the lifetime of that page mount. Currently `sidebar` exposes one field:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `sidebar.show` | Boolean | `true` | Whether the host App's `#sidebar` slot renders for this page. Set to `false` to hide the sidebar declaratively. Works on every page type — including `type:"custom"` where `config` is opaque. |

When `sidebar.show` is `false`:

1. The renderer applies CSS class `cn-page-renderer--no-sidebar` on its wrapper element (consumer-styled hook for layout-driven sidebars).
2. The renderer flips a reactive `cnPageSidebarVisible` value from `true` to `false` and `provide`s it under that inject key.

[`CnAppRoot`](./cn-app-root.md) injects `cnPageSidebarVisible` and gates `<slot name="sidebar" />` accordingly. The default — used when no `CnPageRenderer` ancestor is present (e.g. apps that mount their own page components directly) — resolves to a value-true holder so the slot keeps rendering.

```json
{
  "id": "wide-canvas",
  "type": "custom",
  "title": "Wide canvas",
  "component": "WideCanvasPage",
  "sidebar": { "show": false }
}
```

If your app wires its own sidebar without `CnAppRoot`, inject `cnPageSidebarVisible` directly:

```vue
<script>
export default {
  inject: { cnPageSidebarVisible: { default: () => ({ value: true }) } },
}
</script>
<template>
  <div>
    <router-view />
    <CnObjectSidebar v-if="cnPageSidebarVisible.value !== false" />
  </div>
</template>
```

## Per-page sidebar component

Each page entry MAY declare a top-level `sidebarComponent` field (sibling of `config`) — a string referencing a key in the consuming app's `customComponents` registry. When set, `CnPageRenderer` resolves the name and publishes the resolved component on the `cnPageSidebarComponent` reactive provide channel. [`CnAppRoot`](./cn-app-root.md) injects the holder and renders the resolved component as the **default content** of its `#sidebar` slot.

This is the manifest-side equivalent of Vue Router's named-view sidebar pattern. The canonical use case is a route that needs a completely different sidebar component than the rest of the app — e.g. opencatalogi's `Search` route hosting a `SearchSideBar` instead of the shared `CnIndexSidebar` / `CnObjectSidebar`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `sidebarComponent` | String | unset | Key in `customComponents`. The resolved component renders inside `CnAppRoot`'s `#sidebar` slot **as default content** — the consumer's `#sidebar` slot override (when supplied) wins via Vue's slot mechanic. Unknown names log a `console.warn` and the holder stays `null` (slot falls through to consumer content). |

Composes with `sidebar.show`:

- `sidebar.show: false` ALWAYS wins — the slot does not render at all and the resolved component is suppressed.
- A page declaring both `sidebar.show: false` AND `sidebarComponent` triggers a one-line `console.warn` so manifest authors notice the dead config.

```json
{
  "id": "search",
  "route": "/search",
  "type": "custom",
  "title": "menu.search",
  "component": "SearchPage",
  "sidebarComponent": "SearchSideBar"
}
```

```js
// customComponents registry (passed to CnAppRoot)
import SearchSideBar from './sidebars/search/SearchSideBar.vue'
import SearchPage from './views/search/SearchIndex.vue'

{ SearchPage, SearchSideBar }
```

If your app wires its own sidebar without `CnAppRoot`, inject the holder directly:

```vue
<script>
export default {
  inject: {
    cnPageSidebarVisible: { default: () => ({ value: true }) },
    cnPageSidebarComponent: { default: () => ({ value: null }) },
  },
}
</script>
<template>
  <div v-if="cnPageSidebarVisible.value !== false">
    <component :is="cnPageSidebarComponent.value" v-if="cnPageSidebarComponent.value" />
    <CnObjectSidebar v-else />
  </div>
</template>
```

For per-tab content on the built-in `CnObjectSidebar` (Files / Notes / Tags / Tasks / Audit Trail) use `pages[].config.sidebar.tabs[]` — see [`CnObjectSidebar`](./cn-object-sidebar.md). `sidebarComponent` is for the full-sidebar swap case.

## Slot-override forwarding

```js
// page in manifest
{
  "id": "decisions-detail",
  "type": "detail",
  "slots": { "header": "DecisionHeader", "footer": "DecisionFooter" }
}

// customComponents registry (passed to CnAppRoot or directly to CnPageRenderer)
{ DecisionHeader, DecisionFooter }
```

The renderer mounts the resolved registry components inside the dispatched page component's scoped slots — so the page component receives them under its standard `#header` / `#footer` names with whatever scope it provides.

## Related

- [CnAppRoot](./cn-app-root.md) — Provides manifest / customComponents / pageTypes via inject.
- [defaultPageTypes](../utilities/default-page-types.md) — Built-in `index`, `detail`, `dashboard` types.
- [validateManifest](../utilities/validate-manifest.md) — The validator that enforces `page.id` uniqueness, required fields, and `component` for `type: "custom"` pages.
