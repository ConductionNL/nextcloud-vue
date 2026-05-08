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
- **`pages[]`** — page definitions. `id` (the vue-router route name), `route` (path pattern), `type` (`index | detail | dashboard | custom`), `title` (i18n key), `config` (type-specific), `component` (when `type: "custom"`), optional `headerComponent` / `actionsComponent` slot overrides.

The closed `type` enum is the main defense against DSL creep. Anything bespoke goes in a `type: "custom"` page that resolves a component name from the registry you pass to `CnAppRoot`.

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

The manifest schema ships seven `$defs` documenting recurring `config` sub-shapes:

| `$def` | Purpose | Used inside |
|---|---|---|
| `column` | Table column definition | `pages[].config.columns[]` |
| `action` | Row / bulk action | `pages[].config.actions[]` |
| `widgetDef` | Dashboard widget definition | `pages[].config.widgets[]` |
| `layoutItem` | Dashboard grid layout entry | `pages[].config.layout[]` |
| `formField` | Schema-driven form field | `pages[].config.sections[].fields[]` |
| `sidebarSection` | Index sidebar config group | `pages[].config.sidebar.columnGroups[]` |
| `sidebarTab` | Detail sidebar tab | `pages[].config.sidebarProps.tabs[]` |

Today the `$defs` are reachable by JSON-Pointer (`#/$defs/column`, etc.) but the `pages[].config` block still has `additionalProperties: true` — the `$ref`s into config blocks are deferred to a follow-up after parallel schema-touching changes land. Until then the `$defs` are useful for:

- **IDE autocomplete** — JSON Schema-aware editors can navigate to a `$def` and surface its properties.
- **Ad-hoc validation** — Ajv consumers can validate a fragment directly: `ajv.compile({$ref: '#/$defs/column'})`.
- **Documentation cross-links** — see [docs/utilities/manifest-defs.md](utilities/manifest-defs.md) for one-line examples per `$def`.

The component-level shapes are still the source of truth at runtime; the `$defs` are the JSON-side contract.
