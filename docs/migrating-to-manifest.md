# Migrating to the JSON manifest

`@conduction/nextcloud-vue` ships a JSON-driven manifest renderer. Apps declare their routes, navigation, page content, and widget configuration in a single `src/manifest.json`. The library turns it into a working Nextcloud app shell.

You don't have to adopt the whole stack. Pick a **tier** that fits your app's current state — each tier is self-contained, and you can move up later without breaking anything.

| Tier | Add | What changes |
|---|---|---|
| 1 | `useAppManifest` | Just a validated, reactive manifest. No layout / routing changes. |
| 2 | + `CnPageRenderer` | Reuse the type-dispatch logic. App still owns its router config and root layout. |
| 3 | + `CnAppNav` *(or a custom menu)* | Manifest-driven navigation. App still owns its root shell. |
| 4 | + `CnAppRoot` | Full shell. Loading + dependency-check + menu + router-view, all orchestrated from the manifest. |

---

## Tier 1 — `useAppManifest` only

You get a reactive, validated manifest with the future backend-override merge wired in. Everything else stays in your app.

```ts
import { useAppManifest } from '@conduction/nextcloud-vue'
import bundledManifest from './manifest.json'

export default {
	setup() {
		const { manifest, isLoading, validationErrors } = useAppManifest('myapp', bundledManifest)
		return { manifest, isLoading, validationErrors }
	},
}
```

`manifest.value` is the bundled value immediately, then deep-merged with any `200` from `/index.php/apps/{appId}/api/manifest`. `404` / network errors fall back silently. Schema validation failures keep the bundled value and surface in `validationErrors`.

Use `options.endpoint` and `options.fetcher` to override the URL or inject a mock for tests.

---

## Tier 2 — `+ CnPageRenderer`

Add the type dispatcher. Map your vue-router config to mount `CnPageRenderer` at every route — the renderer reads the manifest and dispatches to `CnIndexPage` / `CnDetailPage` / `CnDashboardPage` / a registry component based on `page.type`.

```ts
import { CnPageRenderer, useAppManifest } from '@conduction/nextcloud-vue'

const { manifest } = useAppManifest('myapp', bundledManifest)

const router = new VueRouter({
	routes: bundledManifest.pages.map((p) => ({
		name: p.id, // page.id IS the vue-router route name
		path: p.route, // page.route is the path pattern
		component: CnPageRenderer,
		props: { manifest: manifest.value, customComponents: { SettingsPage } },
	})),
})
```

CnPageRenderer accepts `manifest`, `customComponents`, and `translate` as props (each falls back to `inject` from a CnAppRoot ancestor when absent), so you can use it standalone.

---

## Tier 3 — `+ CnAppNav` (or your own menu)

Add manifest-driven navigation. Pass `manifest` and `translate` as props (or rely on inject if you wrap CnPageRenderer + your own provide).

```vue
<template>
	<NcContent app-name="myapp">
		<CnAppNav
			:manifest="manifest"
			:translate="translate"
			:permissions="permissions" />
		<router-view />
	</NcContent>
</template>

<script>
import { CnAppNav, useAppManifest } from '@conduction/nextcloud-vue'
import { translate as ncT } from '@nextcloud/l10n'
import bundledManifest from './manifest.json'

export default {
	components: { CnAppNav },
	setup() {
		const { manifest } = useAppManifest('myapp', bundledManifest)
		return { manifest, translate: (key) => ncT('myapp', key) }
	},
	computed: {
		permissions() { return window.OC?.currentUser?.permissions ?? [] },
	},
}
</script>
```

**Custom menu instead?** Skip `CnAppNav` entirely. Either keep your existing menu component, or use `CnAppRoot` (tier 4) and override the `#menu` slot — see below.

### Dynamic per-tenant menu entries

Apps whose top-level navigation depends on runtime data (catalogues, organisations, registers) populate the `menu[]` array from their backend `/api/manifest` endpoint. The bundled manifest declares a static placeholder; the backend resolves per-tenant data and returns the fully-populated list; `useAppManifest`'s deep-merge replaces the bundled `menu[]` with the resolved one (arrays are replaced, not concatenated).

For example, an app like opencatalogi that previously rendered one nav entry per catalogue with `v-for="catalogus in catalogs"` keeps a single placeholder in `src/manifest.json` and lets the backend ship the resolved list:

```json
// src/manifest.json (bundled)
{ "menu": [{ "id": "catalogs", "label": "menu.catalogs", "route": "catalogs-index" }] }

// /index.php/apps/opencatalogi/api/manifest (backend response)
{
  "menu": [{
    "id": "catalogs", "label": "menu.catalogs", "route": "catalogs-index",
    "children": [
      { "id": "catalog-tax", "label": "menu.catalog.tax", "route": "catalog-detail" },
      { "id": "catalog-housing", "label": "menu.catalog.housing", "route": "catalog-detail" }
    ]
  }]
}
```

The full contract — required fields, schema-conformance, i18n key requirement, fallback behaviour — lives in the [`useAppManifest` reference docs](./utilities/composables/use-app-manifest.md#dynamic-per-tenant-menu-entries). The lib never directly queries a register or schema; ADR-022 keeps the data layer behind the app's backend.

---

## Tier 4 — `+ CnAppRoot`

Full shell: phase orchestration (`loading` → `dependency-check` → `shell`), provide/inject for `cnManifest` / `cnCustomComponents` / `cnTranslate`, default loading and dependency-missing screens.

```ts
import Vue from 'vue'
import VueRouter from 'vue-router'
import { translate, translatePlural } from '@nextcloud/l10n'
import { CnAppRoot, CnPageRenderer, useAppManifest } from '@conduction/nextcloud-vue'
import bundledManifest from './manifest.json'
import SettingsPage from './views/SettingsPage.vue'

Vue.use(VueRouter)
Vue.mixin({ methods: { t: translate, n: translatePlural } })

const router = new VueRouter({
	routes: bundledManifest.pages.map((p) => ({
		name: p.id,
		path: p.route,
		component: CnPageRenderer,
	})),
})

new Vue({
	router,
	render: (h) => {
		const { manifest, isLoading } = useAppManifest('myapp', bundledManifest)
		return h(CnAppRoot, {
			props: {
				manifest: manifest.value,
				appId: 'myapp',
				isLoading: isLoading.value,
				customComponents: { SettingsPage },
				translate: (key) => translate('myapp', key),
				permissions: window.OC?.currentUser?.permissions ?? [],
			},
		})
	},
}).$mount('#content')
```

### Keeping a custom menu in Tier 4

Override the `#menu` slot:

```vue
<CnAppRoot :manifest="manifest" app-id="myapp" :translate="t">
	<template #menu>
		<MyCustomMenu />
	</template>
</CnAppRoot>
```

`CnAppRoot` also exposes `#loading`, `#dependency-missing`, `#header-actions`, `#sidebar`, and `#footer` — each independently overridable.

---

## What goes in `manifest.json`

See [`examples/manifest-demo/manifest.json`](../examples/manifest-demo/manifest.json) for a full reference manifest exercising all four page types, nested menu items, permission gating, and a dependency declaration.

Key fields:

- **`version`** — semver of the manifest content. Bump when meaningful changes land.
- **`dependencies`** — Nextcloud app ids that must be installed and enabled. CnAppRoot's dependency-check phase blocks the shell when any are missing.
- **`menu[]`** — top-level nav entries. `id`, `label` (i18n key), optional `icon`, `route` (vue-router route name = page.id), `order`, `permission`, one level of `children[]`.
- **`pages[]`** — page definitions. `id` (the vue-router route name), `route` (path pattern), `type` (`index | detail | dashboard | logs | settings | chat | files | form | custom`), `title` (i18n key), `config` (type-specific), `component` (when `type: "custom"`), optional `headerComponent` / `actionsComponent` slot overrides.

The closed `type` enum is the main defense against DSL creep. Anything bespoke goes in a `type: "custom"` page that resolves a component name from the registry you pass to `CnAppRoot`.

## Per-tenant config slugs — the `@resolve:` sentinel

Most apps have one or two `pages[].config.register` / `config.schema` values that vary per tenant — `theme_register`, `listing_schema`, `voorzieningen_register`, etc. — typically configured by the admin via `IAppConfig`. Hardcoding the slug in `manifest.json` defeats per-tenant configurability; reading the slug at component-mount time defeats the manifest's static-validation property.

The canonical solution is the `@resolve:<key>` sentinel: a load-time-resolved string that the manifest renderer substitutes via `IAppConfig` before validation runs.

```json
{
  "pages": [
    {
      "id": "voorzieningen-index",
      "route": "/voorzieningen",
      "type": "index",
      "title": "softwarecatalog.voorzieningen.title",
      "config": {
        "register": "@resolve:voorzieningen_register",
        "schema": "voorziening"
      }
    }
  ]
}
```

When `useAppManifest('softwarecatalog', bundled)` runs, `pages[0].config.register` is replaced with the value of `IAppConfig::getValue('softwarecatalog', 'voorzieningen_register')` — typically `"voorzieningen"` after the admin has run the install wizard. **Softwarecatalog's 12-page manifest is the canonical reference consumer**: every register slug is a sentinel so the same bundle ships to every tenant.

Rules of thumb:

- **Use `@resolve:` whenever a `pages[].config.*` value would otherwise be a per-tenant string.** Most often `config.register`, `config.schema`, occasionally `config.source` for `type: "logs"`.
- **DO NOT use `@resolve:` outside `pages[].config`.** The validator rejects sentinels in `pages[].id`, `pages[].route`, `pages[].component`, `menu[].route`, `version`, `dependencies[]`, etc. Those are router invariants or registry keys; a dynamic value would break vue-router or the customComponents registry.
- **Surface `unresolvedSentinels` to your admin UI.** When a tenant has not yet set the IAppConfig key, the sentinel resolves to `null`. The composable returns the unresolved key list so you can render a "n settings unconfigured — visit Admin → My App" banner.

See [`resolveManifestSentinels`](./utilities/resolve-manifest-sentinels.md) for the resolution source chain (initial-state → runtime fetch → null) and [`useAppManifest`](./utilities/composables/use-app-manifest.md) for the integrated four-phase load flow.

## Type-selection guide

When a consumer faces a new page, the choice tree is:

1. **Is it primarily a list of objects from a known register/schema?** → `index`.
2. **Is it the editor for a single object?** → `detail`.
3. **Is it a dashboard of widgets?** → `dashboard`.
4. **Is it a read-only audit-trail / activity-log view?** → `logs`.
5. **Is it admin / system config?** → `settings`.
6. **Is it a conversation thread?** → `chat`.
7. **Is it a file browser?** → `files`.
8. **Is it an end-user runtime form (single submit, declarable fields)?** → `form`.
9. **None of the above** → `custom` + a registry component.

The criterion separating built-in from custom is: **does the page have a declarative data shape?** Built-ins do; customs don't. Reach for a built-in whenever your page's data shape fits one — the manifest stays declarative, and the App Builder admin UI can reason about the page automatically. Pick `custom` only when none of the seven shapes fit.

## Migrating from `type: "custom"` to a built-in

Every app's first manifest pass ends up with more `type: "custom"` pages than the team would like. Most settings / admin pages, audit trails, file browsers, and embedded chat threads should move to a built-in once the manifest schema supports them. Here's how each migration looks:

### `custom` → `logs`

Before — bespoke audit-trail page in the consumer:
```jsonc
{ "id": "audit", "type": "custom", "component": "AuditPage", "config": {} }
```

After — manifest-only:
```jsonc
{
  "id": "audit",
  "type": "logs",
  "title": "myapp.audit.title",
  "config": {
    "register": "audit-trail-immutable",
    "schema": "audit-event"
  }
}
```

Drop the `AuditPage.vue` component from the registry. The default `CnLogsPage` renders the same five-column timeline. If the consumer's existing page had bespoke filtering, expose it via a custom `actionsComponent` instead.

### `custom` → `settings`

Before — every app's `views/SettingsPage.vue`:
```jsonc
{ "id": "settings", "type": "custom", "component": "SettingsPage" }
```

After — declared sections:
```jsonc
{
  "id": "settings",
  "type": "settings",
  "title": "myapp.settings.title",
  "config": {
    "sections": [
      {
        "title": "myapp.settings.general",
        "fields": [
          { "key": "feature_x", "type": "boolean", "label": "myapp.settings.feature_x" }
        ]
      }
    ],
    "saveEndpoint": "/index.php/apps/myapp/api/settings"
  }
}
```

Migrate field-by-field. For complex inputs (JSON editors, color pickers), keep `type: "settings"` and fill the `#field-<key>` slot with the bespoke input — you don't have to fall back to `custom` just because one field is non-trivial.

### Rich settings sections

The bare `fields[]` shape works for flat IAppConfig keys, but most app settings pages mix in richer widgets (a version-info card, a register/schema mapper, a bespoke configuration panel). `pages[].config.sections[]` accepts two more body kinds alongside `fields[]` — `component` and `widgets[]`. A section MUST declare exactly one of the three.

```jsonc
{
  "id": "settings",
  "type": "settings",
  "title": "myapp.settings.title",
  "config": {
    "saveEndpoint": "/index.php/apps/myapp/api/settings",
    "sections": [
      {
        "title": "myapp.settings.section.version",
        "widgets": [
          {
            "type": "version-info",
            "props": { "appName": "MyApp", "appVersion": "0.1.0", "showUpdateButton": true }
          }
        ]
      },
      {
        "title": "myapp.settings.section.registers",
        "widgets": [
          {
            "type": "register-mapping",
            "props": {
              "groups": [
                { "name": "Core", "types": [{ "slug": "thing", "label": "Thing" }] }
              ],
              "showReimportButton": true
            }
          }
        ]
      },
      {
        "title": "myapp.settings.section.advanced",
        "component": "MyAdvancedPanel",
        "props": { "foo": "bar" }
      },
      {
        "title": "myapp.settings.section.flags",
        "fields": [
          { "key": "feature_x_enabled", "type": "boolean", "label": "myapp.settings.feature_x" }
        ]
      }
    ]
  }
}
```

Built-in widget types (resolved before the customComponents registry):

| `widget.type` | Component |
|---------------|-----------|
| `version-info` | `CnVersionInfoCard` |
| `register-mapping` | `CnRegisterMapping` |

Anything else falls back to the consumer's `customComponents` registry (the same registry `type: "custom"` pages use).

#### Wiring widget events

Built-in widgets emit events (`CnVersionInfoCard` emits `@update`; `CnRegisterMapping` emits `@save`, `@reimport`, `@update:configuration`). The manifest can't carry inline JS, so `CnSettingsPage` re-emits every widget event as `@widget-event` on itself with payload `{ widgetType, widgetIndex, sectionIndex, name, args }`. Wire one handler at the CnAppRoot mount point and dispatch by `widgetType` / `name`:

```vue
<CnAppRoot
  :manifest="manifest"
  :customComponents="customComponents"
  @widget-event="onWidgetEvent" />
```

```js
methods: {
  onWidgetEvent({ widgetType, name, args }) {
    if (widgetType === 'register-mapping' && name === 'save') {
      this.settingsStore.saveSettings(args[0])
    }
    if (widgetType === 'register-mapping' && name === 'reimport') {
      this.reimportRegister()
    }
  },
}
```

#### Decision tree — which body kind?

1. **Several flat IAppConfig keys?** → `fields: [...]`.
2. **One whole-section pre-built library widget (version, register-mapping)?** → `widgets: [{ type }]`.
3. **Several whole-section widgets stacked?** → `widgets: [...]` with multiple entries.
4. **One bespoke component the library doesn't know about?** → `component: <registry-name>` + `props` (whole-section body) OR `widgets: [{ type: "component", componentName: <registry-name>, props }]` (one of several widgets in a section).
5. **Mostly flat fields with one bespoke input?** → `fields: [...]` plus a `#field-<key>` slot override.

### Multi-tab admin pages (`tabs[]` orchestration)

When a settings page has more than ~4 logical groups (think softwarecatalog's `General`, `Catalogue`, `Sync`, `Connections`, `Mappings`, `Notifications`, `Branding`, `Advanced`), a flat `sections[]` stack becomes a long scroll. Use `tabs[]` to group sections under tab buttons:

```jsonc
{
  "id": "Settings",
  "type": "settings",
  "title": "myapp.settings.title",
  "config": {
    "saveEndpoint": "/index.php/apps/myapp/api/settings",
    "tabs": [
      { "id": "general",  "label": "myapp.settings.tab.general",  "sections": [ /* same shape as the flat case */ ] },
      { "id": "about",    "label": "myapp.settings.tab.about",    "sections": [
        { "title": "myapp.settings.section.about", "widgets": [
          { "type": "version-info", "props": { "appName": "MyApp", "appVersion": "0.1.0" } }
        ] }
      ] },
      { "id": "advanced", "label": "myapp.settings.tab.advanced", "sections": [ /* … */ ] }
    ]
  }
}
```

Rules:

- `sections[]` and `tabs[]` are XOR — a page declares one or the other. The validator rejects manifests with both at the page-`config` level.
- Each tab MUST have non-empty `id` and `label`, plus a non-empty `sections: [...]`. Tab IDs MUST be unique within the page.
- The first tab is active by default. Override via the `initialTab` prop on `CnSettingsPage` (typically wired through `CnPageRenderer.pageTypeProps`).
- The page emits `@tab-change` with `{ tabId, tabIndex }` when the user clicks a different tab — wire it to your preference store or URL hash if you want the active tab to survive a reload.

### Custom component widgets (`{ type: "component", componentName }`)

When a settings section needs to host a bespoke consumer Vue component as one of several widgets in the section, use the explicit `component` discriminator with `componentName`:

```jsonc
{
  "title": "myapp.settings.section.workflow",
  "widgets": [
    {
      "type": "component",
      "componentName": "WorkflowEditor",
      "props": { "schemaSlug": "workflow" }
    }
  ]
}
```

`componentName` resolves against the customComponents registry passed to `CnAppRoot`. The legacy `widget.type === <registry-name>` fallback path is kept for back-compat with `manifest-settings-rich-sections` consumers, but is JSDoc-deprecated — `{ type: "component", componentName }` is the recommended way going forward because it makes the manifest reader aware that the widget body is NOT a built-in.

### `custom` → `chat`

Before — a Talk-embed page:
```jsonc
{ "id": "chat", "type": "custom", "component": "TalkEmbed", "config": { "url": "..." } }
```

After:
```jsonc
{
  "id": "chat",
  "type": "chat",
  "title": "myapp.chat.title",
  "config": { "conversationSource": "/index.php/apps/spreed/embed/abc123" }
}
```

Native thread renderers (no iframe) still need `type: "chat"` plus a `#conversation` slot fill — that stays inside the manifest convention while letting you bring your own UI.

### `custom` → `files`

Before — an in-app file browser:
```jsonc
{ "id": "uploads", "type": "custom", "component": "UploadsPage" }
```

After:
```jsonc
{
  "id": "uploads",
  "type": "files",
  "title": "myapp.uploads.title",
  "config": {
    "folder": "/myapp/uploads",
    "allowedTypes": ["application/pdf"]
  }
}
```

The default listing is read-only. If you need upload / rename / delete, fill the `#files-view` slot with your existing file-picker — the slot scope (`{ folder, allowedTypes, files, loading, error, refresh }`) gives you everything the manifest declared without re-reading it.

### `custom` → `form` (runtime form rendering)

`type: "form"` mounts `CnFormPage` and renders a flat `fields[]` array plus a submit button. Use it for **end-user runtime forms** — public surveys, "request a quote" pages, contact forms — where the entire route is "render this list of fields, send the result somewhere."

```json
{
  "id": "PublicSurvey",
  "route": "/public/survey/:token",
  "type": "form",
  "title": "Survey",
  "config": {
    "fields": [
      { "key": "rating",  "label": "Rating",   "type": "number" },
      { "key": "comment", "label": "Comments", "type": "string", "widget": "textarea" }
    ],
    "submitHandler": "submitPublicSurvey",
    "mode": "public"
  }
}
```

Submit dispatch picks one of two paths based on which field is set in `config`:

- `submitHandler: "<registryName>"` — looks the name up in your `customComponents` registry and calls it with `(formData, $route, $router)`. Use this when the submit needs auth, CSRF tokens, or non-trivial URL building.
- `submitEndpoint: "<url>"` — the page calls `axios[method](url, formData)` directly. URL `:paramName` segments resolve from `$route.params` (so `/api/survey/:token` works automatically).

Stay on `type: "custom"` when the route is a **form *builder*** (drag-drop questions, branching logic, per-field validation panel) — the manifest's declarative shape doesn't fit a builder UI. See `CnFormPage` docs for the full prop reference.

### When to stick with `custom`

Some shapes don't fit any built-in:

- **Drag-and-drop kanban / pipeline editors** (Pipelinq) — defer to a future `kanban` type.
- **Form *builder* / authoring UIs** — drag-drop question ordering, branching logic editors, submission tables. The runtime *renderer* lives on `type: "form"`; the builder stays bespoke.
- **Org-tree / org-chart views** — no built-in today.
- **Map views** (geographic data) — no built-in today.
- **Multi-step wizards** — keep custom; wizards are too app-specific for a closed shape.

`type: "custom"` will always exist as the escape hatch. The goal of the manifest convention is to keep its share under ~30% across the fleet.

## Custom-component registry

```ts
import SettingsPage from './views/SettingsPage.vue'
import DecisionsHeader from './views/DecisionsHeader.vue'

const customComponents = {
	SettingsPage, // for type: "custom" pages with `"component": "SettingsPage"`
	DecisionsHeader, // for `headerComponent: "DecisionsHeader"` slot overrides
}
```

Pass it to `CnAppRoot` (Tier 4) or to `CnPageRenderer` (Tier 2/3). The library statically imports nothing app-specific — your registry is the audit point for "what custom code does this app actually have?".

## Sidebar (manifest-driven)

Both index and detail pages can drive their sidebar entirely from `manifest.json` — no consumer-side wiring required for the common shapes.

### Index sidebar

Set `pages[].config.sidebar` on a `type: "index"` page to auto-mount `CnIndexSidebar` inside `CnIndexPage`:

```jsonc
{
  "id": "decisions",
  "route": "/decisions",
  "type": "index",
  "title": "myapp.decisions.title",
  "config": {
    "register": "decisions",
    "schema": "decision",
    "sidebar": {
      "enabled": true,
      "showMetadata": true,
      "search": { "searchPlaceholder": "myapp.decisions.search" }
    }
  }
}
```

Shape: `{ enabled, show?, columnGroups?, facets?, showMetadata?, search? }`. `show` (default `true`) is a separate visibility gate — set `false` to hide the embedded sidebar without removing the rest of the config. Forward search/filter/columns events at the page level (`@search`, `@columns-change`, `@filter-change` on `CnIndexPage`).

### Detail sidebar tabs

Set `pages[].config.sidebarProps.tabs` on a `type: "detail"` page to drive `CnObjectSidebar`'s tabs from the manifest. Each tab declares either a `widgets` list (`type: 'data' | 'metadata' | <registry-name>`) or a `component` registry name:

```jsonc
{
  "id": "decision",
  "route": "/decisions/:id",
  "type": "detail",
  "title": "myapp.decisions.detail",
  "config": {
    "register": "decisions",
    "schema": "decision",
    "sidebar": true,
    "sidebarProps": {
      "tabs": [
        { "id": "overview", "label": "myapp.tabs.overview",
          "widgets": [{ "type": "data" }, { "type": "metadata" }] },
        { "id": "related", "label": "myapp.tabs.related",
          "component": "MyRelatedTab" }
      ]
    }
  }
}
```

The `tabs` array flows through the existing `objectSidebarState` provide/inject channel that `CnDetailPage` already populates with `objectId` / `register` / `schema` / `hiddenTabs`. The host app's mounted `CnObjectSidebar` reads it and replaces the hard-coded built-in tab set (Files / Notes / Tags / Tasks / Audit Trail) with the manifest's array. When unset, the built-in tabs render as today.

Custom tab `component` names resolve against the same `customComponents` registry that powers `type: "custom"` pages and `headerComponent` / `actionsComponent` overrides, so one registry covers every consumer-injected component.

### Detail sidebar Object form (preferred)

`config.sidebar` on a detail page now ALSO accepts an Object that mirrors the index sidebar shape. The Object form folds register / schema / hiddenTabs / title / subtitle / tabs into a single config block — no more split between `sidebar` (Boolean) and `sidebarProps` (Object):

```jsonc
{
  "id": "decision",
  "route": "/decisions/:id",
  "type": "detail",
  "title": "myapp.decisions.detail",
  "config": {
    "register": "decisions",
    "schema": "decision",
    "sidebar": {
      "show": true,
      "register": "decisions",
      "schema": "decision",
      "hiddenTabs": ["notes"],
      "tabs": [
        { "id": "overview", "label": "myapp.tabs.overview",
          "widgets": [{ "type": "data" }, { "type": "metadata" }] },
        { "id": "related", "label": "myapp.tabs.related",
          "component": "MyRelatedTab" }
      ]
    }
  }
}
```

The Boolean form (`"sidebar": true`) and the legacy `sidebarProps` field continue to work for backwards compatibility. Migrate at your own pace — the library logs a one-shot `console.warn` per `CnDetailPage` instance the first time it observes the Boolean form.

### Hiding the sidebar per page (`pages[].sidebar.show`)

Every page entry MAY declare a top-level `sidebar` field (sibling of `config`) with one sub-property — `show: boolean`. When `false`, the host App's `#sidebar` slot stops rendering for that page, and `CnPageRenderer` applies the CSS hook class `cn-page-renderer--no-sidebar` on its wrapper. Works on **every** page type, including `type: "custom"`:

```jsonc
{
  "id": "wide-canvas",
  "route": "/wide",
  "type": "custom",
  "title": "myapp.wide",
  "component": "WideCanvasPage",
  "sidebar": { "show": false }
}
```

This avoids the older "drop into `type: 'custom'` and re-implement the shell just to hide a sidebar" workaround. Apps shelling via `CnAppRoot` get this for free — `CnAppRoot` already gates `<slot name="sidebar" />` on the `cnPageSidebarVisible` inject. Apps that mount their own sidebar without `CnAppRoot` need to inject `cnPageSidebarVisible` themselves and gate accordingly (one inject + a `v-if`).

## i18n

The manifest stores translation keys only — `decidesk.menu.decisions`, never inline strings. Pass a `translate` function (`(key) => string`) to `CnAppRoot` / `CnAppNav` / `CnPageRenderer`. Typically a closure over `@nextcloud/l10n`'s `translate(appId, key)`. The library never imports `t()` from a specific app.

This makes mechanical i18n key checking possible in CI — every translatable string in the manifest is a static field of a known shape (see `ConductionNL/hydra#194`).

## Validating manifests at build time

```ts
import { validateManifest } from '@conduction/nextcloud-vue'

const result = validateManifest(myManifest)
if (!result.valid) {
	console.error('manifest invalid:', result.errors)
	process.exit(1)
}
```

The same validator runs at runtime inside `useAppManifest` against any backend-merged result; failures fall back to the bundled manifest with a console.warn.

## Schema-validated config shapes

As of schema **version 1.2.0** (the `manifest-config-refs` change), the manifest schema's seven `$defs` are referenced from the recurring `pages[].config` sub-properties they describe. Editor autocomplete, build-time Ajv validation, and CI lint surface schema-level enforcement against the typed shapes.

| `$def` | Purpose | Used inside |
|---|---|---|
| `column` | Table column definition | `pages[].config.columns[]` (`index`, `logs`) — admits string-shorthand via `oneOf` |
| `action` | Row / bulk action | `pages[].config.actions[]` (`index`) |
| `widgetDef` | Dashboard widget definition | `pages[].config.widgets[]` (`dashboard`) |
| `layoutItem` | Dashboard grid layout entry | `pages[].config.layout[]` (`dashboard`) |
| `formField` | Schema-driven form field | `pages[].config.sections[].fields[]` (`settings`) |
| `sidebarSection` | Index sidebar config group | `pages[].config.sidebar.columnGroups[]` (`index`) |
| `sidebarTab` | Detail sidebar tab | `pages[].config.sidebar.tabs[]` (preferred) and `pages[].config.sidebarProps.tabs[]` (legacy) (`detail`) |

The OUTER `pages[].config` block keeps `additionalProperties: true` so per-type scalars (`register`, `schema`, `source`, `folder`, `saveEndpoint`, `conversationSource`, `postUrl`, `allowedTypes`) and consumer-app extension keys remain free-form. The detail `config.sidebar` is a `oneOf [boolean, object]` — the legacy boolean form keeps validating; the Object form's `tabs[]` is typed but the rest of the object stays open.

### What error messages look like

The `validateManifest` FE helper mirrors the schema's strictness with JSON-pointer-shaped error messages:

```js
import { validateManifest } from '@conduction/nextcloud-vue'

const result = validateManifest(myManifest)
if (!result.valid) {
  console.error(result.errors)
  // [
  //   '/pages/0/config/widgets/0/type: must be a non-empty string',
  //   '/pages/2/config/actions/0/label: must be a non-empty string',
  //   '/pages/3/config/sections/0/fields/0/type: must be one of boolean, number, string, enum, password, json',
  //   '/pages/4/config/layout/0/gridWidth: must be >= 1',
  // ]
}
```

JSON Schema-aware editors (VSCode + the JSON / YAML schema extension) surface inline shape violations against the same `$ref`s.

### Legacy shorthand kept for back-compat

Existing v1.0 / v1.1 manifests with `columns: ["title", "status", "deadline"]` (array of strings) keep validating — the `oneOf` admits both the shorthand string form and the typed object form. Detail `config.sidebar: true` / `false` (boolean) likewise keeps validating.

The component-level shapes remain the source of truth at runtime; the `$defs` are the JSON-side contract. See [docs/utilities/manifest-defs.md](utilities/manifest-defs.md) for one-line examples per `$def` plus the full custom-fallback list.
