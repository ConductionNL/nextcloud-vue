# json-manifest-renderer — Specification

## Purpose

Defines the manifest shape, loading composable, renderer components, and JSON Schema for the JSON-driven page and navigation system in `@conduction/nextcloud-vue`. Consuming apps declare routes, menu entries, page types, and widget configuration in a single `src/manifest.json`; the library's components render the result without per-page boilerplate.

**New files introduced by this capability:**
- `src/schemas/app-manifest.schema.json`
- `src/types/manifest.d.ts`
- `src/composables/useAppManifest.js`
- `src/components/CnAppRoot/CnAppRoot.vue`
- `src/components/CnAppNav/CnAppNav.vue`
- `src/components/CnPageRenderer/CnPageRenderer.vue`

---

## Requirements

### Requirement: REQ-JMR-001 — Manifest JSON Schema

A JSON Schema file at `src/schemas/app-manifest.schema.json` MUST define the canonical manifest structure. It MUST be the single source of truth used by FE validation and future BE validation.

**Schema metadata (JSON Schema draft 2020-12):**
- `"$schema": "https://json-schema.org/draft/2020-12/schema"`
- `"$id": "https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest.schema.json"` (resolves to the schema file on the main branch; editors can fetch and validate against it)
- `"title": "Conduction App Manifest"`
- `"description"`: brief description of purpose
- `"version"`: semver of the schema definition itself (e.g. `"1.0.0"`); bump when the schema shape changes

The schema MUST define the following top-level structure:
```json
{
  "$schema": "https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest.schema.json",
  "version": "<semver string — content version, bumped when manifest changes>",
  "menu": [ <menu items> ],
  "pages": [ <page items> ],
  "dependencies": [ "<nextcloud-app-id>", ... ]
}
```

**Top-level field semantics:**
- `$schema` (string, optional): URL of the schema used; enables editor auto-validation
- `version` (string, REQUIRED): semver of the manifest content. Distinct from the schema's own version. Used for cache busting and app-builder migration tracking. MUST match semver pattern `^\d+\.\d+\.\d+`.
- `dependencies` (array of strings, optional, default `[]`): Nextcloud app IDs that MUST be installed and enabled for this app to function. CnAppRoot checks these and shows `CnDependencyMissing` when any are absent.

Menu items MUST include: `id` (string, required), `label` (string, required — i18n key), `icon` (string, optional), `route` (string, optional), `order` (integer, optional), `permission` (string, optional), `children` (array of menu items, optional, max one level deep).

Page items MUST include: `id` (string, required — also serves as the vue-router route name for this page), `route` (string, required — the path pattern, e.g. `/decisions` or `/decisions/:id`; used by consuming apps to build their vue-router config), `type` (enum: `"index" | "detail" | "dashboard" | "logs" | "settings" | "chat" | "files" | "custom"`, required), `title` (string, required — i18n key), `config` (object, optional), `component` (string, optional — for `type: "custom"`), `headerComponent` (string, optional), `actionsComponent` (string, optional).

`pages[].id` MUST be unique within the manifest. `CnPageRenderer` uses `$route.name === page.id` for matching — no path matching.

The `type` field MUST be a closed enum. Adding new types requires a library schema release. Subsequent extensions: `manifest-page-type-extensions` (schema v1.1) added `logs`, `settings`, `chat`, `files` to the enum and shipped matching default components — see `nextcloud-vue/openspec/changes/manifest-page-type-extensions/specs/manifest-page-type-extensions/spec.md`.

#### Scenario: Schema validates a minimal valid manifest

- GIVEN a manifest `{ "version": "1.0.0", "menu": [], "pages": [] }`
- WHEN validated against `app-manifest.schema.json`
- THEN validation MUST pass with no errors

#### Scenario: Schema rejects unknown page type

- GIVEN a manifest with `pages: [{ "id": "x", "route": "/x", "type": "wizard", "title": "x" }]`
- WHEN validated against `app-manifest.schema.json`
- THEN validation MUST fail with an error on the `type` field referencing the closed enum

#### Scenario: Schema allows custom page with component field

- GIVEN a manifest with `pages: [{ "id": "settings", "route": "/settings", "type": "custom", "title": "app.settings", "component": "SettingsPage" }]`
- WHEN validated against `app-manifest.schema.json`
- THEN validation MUST pass

#### Scenario: Schema rejects missing required page fields

- GIVEN a manifest with `pages: [{ "type": "index" }]` (missing `id`, `route`, `title`)
- WHEN validated against `app-manifest.schema.json`
- THEN validation MUST fail listing the missing required fields

#### Scenario: Schema validates manifest with `$schema` field set

- GIVEN a manifest `{ "$schema": "https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest.schema.json", "version": "1.0.0", "menu": [], "pages": [] }`
- WHEN validated against `app-manifest.schema.json`
- THEN validation MUST pass

#### Scenario: Manifest with non-semver version fails validation

- GIVEN a manifest `{ "version": "not-semver", "menu": [], "pages": [] }`
- WHEN validated against `app-manifest.schema.json`
- THEN validation MUST fail with an error on the `version` field referencing the semver pattern

---

### Requirement: REQ-JMR-002 — useAppManifest Composable: Load and Validate

The `useAppManifest(appId: string)` composable MUST implement a three-phase load:

1. **Synchronous bundled load** — import the consuming app's bundled `src/manifest.json` (passed as `bundledManifest` argument). Available instantly; used as initial value.
2. **Async BE merge** — fetch `/index.php/apps/{appId}/api/manifest` via `@nextcloud/axios`. On HTTP 200, deep-merge the response over the bundled manifest. On any error (404, network, non-200), silently ignore.
3. **Validation** — validate the merged result against `app-manifest.schema.json` using Ajv (or equivalent). On failure, log a `console.warn` and revert to the bundled manifest.

The composable MUST return a reactive manifest object that components can watch for changes.

**Signature:** `useAppManifest(appId: string, bundledManifest: object, options?: { endpoint?: string, fetcher?: Function }): { manifest: Ref<ManifestObject>, isLoading: Ref<boolean>, validationErrors: Ref<string[]|null> }`

- `options.endpoint` (string, optional): overrides the default BE fetch URL (`generateUrl('/apps/{appId}/api/manifest')`). Useful for tests and alternative-host deployments.
- `options.fetcher` (Function, optional): overrides the HTTP client (default: `@nextcloud/axios`). Signature: `(url: string) => Promise<{ data: object }>`. Used in unit tests to inject a mock.

#### Scenario: Returns bundled manifest synchronously before BE fetch

- GIVEN `useAppManifest('decidesk', bundledManifest)` is called
- WHEN the composable is initialised (before the BE fetch resolves)
- THEN `manifest.value` MUST equal `bundledManifest`
- AND `isLoading.value` MUST be `true`

#### Scenario: Deep-merges BE response on 200

- GIVEN the BE endpoint `/index.php/apps/decidesk/api/manifest` returns HTTP 200 with `{ "version": "2.0.0", "menu": [{ "id": "extra", "label": "app.extra" }] }`
- WHEN the fetch resolves
- THEN `manifest.value.version` MUST be `"2.0.0"`
- AND `manifest.value.pages` MUST still contain the bundled pages (deep merge, not replace)
- AND `isLoading.value` MUST be `false`

#### Scenario: Silently falls back on BE 404

- GIVEN the BE endpoint returns HTTP 404
- WHEN the fetch resolves
- THEN `manifest.value` MUST equal the original `bundledManifest`
- AND no error MUST be thrown or shown to the user
- AND `isLoading.value` MUST be `false`

#### Scenario: Falls back to bundled on schema validation failure

- GIVEN the BE returns a manifest with `pages: [{ "type": "wizard" }]` (invalid type)
- WHEN the merged manifest fails schema validation
- THEN `manifest.value` MUST revert to `bundledManifest`
- AND `console.warn` MUST be called with a message containing the validation error
- AND `validationErrors.value` MUST contain the error strings

#### Scenario: Options API compatibility

- GIVEN a Vue 2 Options API component with `setup() { return useAppManifest('decidesk', manifest) }`
- THEN `manifest`, `isLoading`, and `validationErrors` MUST be accessible in the template and via `this`

#### Scenario: Custom endpoint option is used for BE fetch

- GIVEN `useAppManifest('decidesk', manifest, { endpoint: '/custom/url' })`
- WHEN the async BE fetch executes
- THEN the fetch MUST target `/custom/url` instead of the default generated URL

---

### Requirement: REQ-JMR-003 — CnAppRoot: Top-Level Wrapper and Provide

`CnAppRoot` MUST be a Vue 2 Options API component that wraps `NcContent` and sets up Vue `provide` for manifest data and the translate function.

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `manifest` | Object | yes | — | The reactive manifest object from `useAppManifest` |
| `appId` | String | yes | — | The Nextcloud app ID (used for manifest fetch) |
| `customComponents` | Object | no | `{}` | Registry mapping component name strings to component definitions |
| `t` | Function | no | `(key) => key` | The consuming app's translate function |

**Provide keys:**
- `cnManifest` → the `manifest` prop (reactive)
- `cnCustomComponents` → the `customComponents` prop
- `cnTranslate` → the `t` prop (defaulting to identity function). Note: the CnAppRoot prop is named `t` (matching Nextcloud convention); the provide key is `cnTranslate` (full word, consistent with `cnManifest`, `cnCustomComponents`).

**Slots:**

| Slot | Default content | Description |
|------|-----------------|-------------|
| `#loading` | `<CnAppLoading />` | Rendered when `isLoading === true`. Override for custom loading screen. |
| `#dependency-missing="{ dependencies }"` | `<CnDependencyMissing :dependencies="..." />` | Rendered when a manifest dependency is missing/disabled. Receives the unresolved dependency list. |
| `#menu` | `<CnAppNav :permissions="permissions" />` | The navigation panel. Override to use a custom menu component without replacing CnAppRoot. |
| `#header-actions` | (empty) | Extra buttons passed into NcContent's header area (right side). |
| `#sidebar` | (empty) | Object sidebar, per ADR-017's sidebar pattern. |
| `#footer` | (empty) | Footer area below router-view. |

**Phase orchestration (template logic):**
1. If `isLoading === true` → render `#loading` slot.
2. Else if any `manifest.dependencies` entry is missing or disabled → render `#dependency-missing` slot.
3. Else → render app shell: `#menu` slot + `<router-view />` + optional `#header-actions`, `#sidebar`, `#footer`.

**Template:** `NcContent` wrapping a `<div class="cn-app-root">` that implements the phase orchestration above.

#### Scenario: Provides manifest to descendants

- GIVEN `CnAppRoot` is mounted with a `manifest` prop
- WHEN a descendant component calls `inject('cnManifest')`
- THEN it MUST receive the manifest object
- AND if `manifest` is reactive (a Vue ref or reactive object), injected consumers MUST see updates

#### Scenario: Provides identity t when not passed

- GIVEN `CnAppRoot` is mounted without a `t` prop
- WHEN a descendant injects `cnTranslate` and calls `cnTranslate('some.key')`
- THEN the return value MUST be `'some.key'` (identity fallback, no crash)

#### Scenario: Provides custom component registry

- GIVEN `CnAppRoot` is mounted with `customComponents: { SettingsPage: SettingsPageComponent }`
- WHEN a descendant injects `cnCustomComponents`
- THEN it MUST receive `{ SettingsPage: SettingsPageComponent }`

#### Scenario: Backwards compatible with no customComponents

- GIVEN `CnAppRoot` is mounted without the `customComponents` prop
- WHEN mounted
- THEN no error MUST be thrown
- AND `inject('cnCustomComponents')` MUST return `{}`

#### Scenario: Consumer provides a #menu slot — CnAppRoot renders it instead of CnAppNav

- GIVEN `CnAppRoot` is mounted with a `#menu` slot containing `<MyCustomMenu />`
- WHEN mounted
- THEN `<MyCustomMenu />` MUST be rendered in the navigation area
- AND `CnAppNav` MUST NOT be rendered

#### Scenario: CnAppRoot renders #loading slot while isLoading is true

- GIVEN `useAppManifest` has `isLoading === true`
- WHEN `CnAppRoot` renders
- THEN the `#loading` slot content (default: `CnAppLoading`) MUST be rendered
- AND the app shell (menu + router-view) MUST NOT be rendered

#### Scenario: CnAppRoot renders #dependency-missing when a dependency is absent

- GIVEN `manifest.dependencies = ["openregister"]` and `useAppStatus('openregister')` returns `{ installed: false }`
- WHEN `CnAppRoot` renders (after loading is complete)
- THEN the `#dependency-missing` slot content (default: `CnDependencyMissing`) MUST be rendered
- AND the app shell MUST NOT be rendered

---

### Requirement: REQ-JMR-004 — CnAppNav: Manifest-Driven Navigation

`CnAppNav` MUST render the `menu[]` array from the manifest as a Nextcloud app navigation using `NcAppNavigation` and `NcAppNavigationItem`.

**Inject (fallback):** `cnManifest`, `cnTranslate`

**Standalone props (take precedence over inject when provided):**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `manifest` | Object | no | `inject('cnManifest')` | Manifest object. When provided, overrides injected value. |
| `translate` | Function | no | `inject('cnTranslate') \|\| ((k) => k)` | Translate function. When provided, overrides injected value. |
| `permissions` | Array | no | `[]` | List of permission strings the current user holds |

**Behaviour:**
- Renders menu items in ascending `order` (undefined order items go last)
- Applies `permission` filter: if `permission` is set, the item MUST only render if the consumer has granted that permission (passed as the `permissions` prop; if `permissions` prop is absent, all items render)
- Resolves `label` via the effective translate function (prop or inject) at render time
- Highlights the active route: the item whose `route` matches `$route.name` MUST receive the `active` prop on `NcAppNavigationItem`
- Supports `children[]` for one level of nested nav items (rendered as nested `NcAppNavigationItem` components)

#### Scenario: Renders menu items in order

- GIVEN `manifest.menu = [{ id: "b", label: "app.b", order: 2 }, { id: "a", label: "app.a", order: 1 }]`
- WHEN CnAppNav renders
- THEN item "a" MUST appear before item "b" in the DOM

#### Scenario: Resolves label via injected t

- GIVEN injected `cnTranslate = (key) => key.split('.').pop()` and a menu item with `label: "app.decisions"`
- WHEN CnAppNav renders
- THEN the nav item text MUST be `"decisions"`

#### Scenario: Filters items by permission

- GIVEN a menu item with `permission: "admin"` and `permissions` prop is `["user"]`
- WHEN CnAppNav renders
- THEN the item with `permission: "admin"` MUST NOT appear in the DOM

#### Scenario: Shows all items when permissions prop is absent

- GIVEN a menu item with `permission: "admin"` and the `permissions` prop is not provided
- WHEN CnAppNav renders
- THEN the item MUST render (default: open)

#### Scenario: Highlights active route

- GIVEN `$route.name === 'decisions'` and a menu item with `route: "decisions"`
- WHEN CnAppNav renders
- THEN the corresponding `NcAppNavigationItem` MUST have `active` set to `true`

#### Scenario: Renders nested children

- GIVEN a menu item with `children: [{ id: "sub1", label: "app.sub1", route: "sub1" }]`
- WHEN CnAppNav renders
- THEN a nested `NcAppNavigationItem` for "sub1" MUST appear inside the parent item

---

### Requirement: REQ-JMR-005 — CnPageRenderer: Type-Dispatching Page Renderer

`CnPageRenderer` MUST find the current page definition from `manifest.pages[]` by matching `$route.name === page.id`, and render the appropriate component for `page.type`.

**Inject (fallback):** `cnManifest`, `cnCustomComponents`, `cnTranslate`

**Standalone props (take precedence over inject when provided):**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `manifest` | Object | no | `inject('cnManifest')` | Manifest object. When provided, overrides injected value. Enables use without CnAppRoot. |
| `customComponents` | Object | no | `inject('cnCustomComponents') \|\| {}` | Custom component registry. When provided, overrides injected value. |
| `translate` | Function | no | `inject('cnTranslate') \|\| ((k) => k)` | Translate function. When provided, overrides injected value. |

**Route matching:** `CnPageRenderer` matches `$route.name === page.id`. Only name matching. The `page.route` field is the path pattern for the consuming app's vue-router config and is not used for matching here.

**Type dispatch (via `defineAsyncComponent`):**
- `"index"` → `CnIndexPage` with `config.register`, `config.schema`, `config.columns`, `config.actions` forwarded as props
- `"detail"` → `CnDetailPage` with `config.register`, `config.schema`, `config.tabs` forwarded as props
- `"dashboard"` → `CnDashboardPage` with `config.widgets`, `config.layout` forwarded as props
- `"custom"` → component resolved from the effective `customComponents[page.component]`; renders nothing and logs a warning if the component name is not found in the registry

**Root element:** `<div :data-page-id="page.id" class="cn-page-renderer">` — enables devtools and Playwright selectors.

**Component display name:** Set `this.$options.name = 'CnPageRenderer:' + page.id` in `created()` for Vue devtools identification.

**Slot overrides for index and detail pages:**
- `headerComponent` field on a page entry: if set to a registry name, the resolved component is passed into `CnIndexPage`'s `#header` slot (or `CnDetailPage`'s equivalent). Note: `#header` and `#actions` slots are part of this change (additive — see task 3.4); existing consumers of `CnIndexPage`/`CnDetailPage` are not affected.
- `actionsComponent` field: same pattern for the `#actions` slot.

If no matching page is found for the current route, `CnPageRenderer` MUST render nothing and log a `console.warn`.

#### Scenario: Renders CnIndexPage for type=index

- GIVEN the current route matches a page `{ id: "decisions", route: "/decisions", type: "index", config: { register: "reg1", schema: "schema1" } }` and `$route.name === "decisions"`
- WHEN CnPageRenderer renders
- THEN `CnIndexPage` MUST be rendered with `register="reg1"` and `schema="schema1"`
- AND the root element MUST have `data-page-id="decisions"`

#### Scenario: Route matching is by name only

- GIVEN `$route.name === 'decisions'` and a page with `id: 'decisions', route: '/decisions'`
- WHEN CnPageRenderer renders
- THEN CnPageRenderer MUST match the page using `$route.name === page.id`
- AND MUST NOT attempt to match by path

#### Scenario: Renders CnDashboardPage for type=dashboard

- GIVEN a page `{ id: "home", route: "/home", type: "dashboard", config: { widgets: [...], layout: [...] } }` and `$route.name === "home"`
- WHEN CnPageRenderer renders
- THEN `CnDashboardPage` MUST be rendered with the widgets and layout from config

#### Scenario: Renders custom component for type=custom

- GIVEN a page `{ id: "settings", route: "/settings", type: "custom", component: "SettingsPage" }`, `$route.name === "settings"`, and `cnCustomComponents = { SettingsPage: SettingsPageVue }`
- WHEN CnPageRenderer renders
- THEN `SettingsPageVue` MUST be rendered
- AND the root element MUST have `data-page-id="settings"`

#### Scenario: Logs warning for unknown custom component

- GIVEN a page with `type: "custom", component: "NonExistent"` and the component name is not in `cnCustomComponents`
- WHEN CnPageRenderer renders
- THEN `console.warn` MUST be called with a message identifying the missing component name
- AND nothing (empty div) MUST render rather than crashing

#### Scenario: Logs warning for unmatched route

- GIVEN the current `$route.name` does not match any `pages[].id`
- WHEN CnPageRenderer renders
- THEN `console.warn` MUST be called
- AND the component MUST render nothing

#### Scenario: Component name is set for Vue devtools

- GIVEN a page with `id: "decisions"`
- WHEN CnPageRenderer's `created()` hook runs
- THEN `this.$options.name` MUST be `"CnPageRenderer:decisions"`

#### Scenario: Slot override wires headerComponent

- GIVEN a page `{ id: "decisions", type: "index", headerComponent: "DecisionsHeader" }` and `cnCustomComponents = { DecisionsHeader: DecisionsHeaderVue }`
- WHEN CnPageRenderer renders
- THEN `DecisionsHeaderVue` MUST be passed into the `#header` slot of `CnIndexPage`

#### Scenario: CnPageRenderer works standalone with explicit manifest prop

- GIVEN `CnPageRenderer` is mounted with an explicit `manifest` prop and no parent CnAppRoot providing inject values
- WHEN `$route.name` matches a page in the provided manifest
- THEN CnPageRenderer MUST render the correct page component using the prop manifest

#### Scenario: Route params are accessible directly in dispatched pages

- GIVEN `$route.params.id === 'abc'` and a page rendering `CnDetailPage` for route `/decisions/:id`
- WHEN `CnPageRenderer` dispatches to `CnDetailPage`
- THEN the `CnDetailPage` instance MUST be able to access `$route.params.id` via Vue Router's globally injected `$route` (no special forwarding needed from CnPageRenderer)

---

### Requirement: REQ-JMR-006 — Barrel Exports

All new components and composables MUST be exported through the standard barrel chain.

- `src/components/CnAppRoot/index.js` — re-exports `CnAppRoot`
- `src/components/CnAppNav/index.js` — re-exports `CnAppNav`
- `src/components/CnPageRenderer/index.js` — re-exports `CnPageRenderer`
- `src/components/CnAppLoading/index.js` — re-exports `CnAppLoading`
- `src/components/CnDependencyMissing/index.js` — re-exports `CnDependencyMissing`
- `src/components/index.js` — adds all five new components
- `src/index.js` — adds `useAppManifest`, `useAppStatus`, and all five new components

#### Scenario: Tree-shakable named imports work

- GIVEN `import { CnAppRoot, CnAppNav, CnPageRenderer, CnAppLoading, CnDependencyMissing, useAppManifest, useAppStatus } from '@conduction/nextcloud-vue'`
- THEN all imports MUST resolve without error
- AND unused page type components MUST not inflate the bundle of apps that don't use them (verified via Rollup bundle analysis)

---

### Requirement: REQ-JMR-007 — CLAUDE.md Documentation Update

The library's `CLAUDE.md` MUST be updated to document the new components and composable in the relevant sections.

#### Scenario: CLAUDE.md reflects new components

- GIVEN the CLAUDE.md file is read by an agent
- THEN `CnAppRoot`, `CnAppNav`, `CnPageRenderer` MUST appear under the "Layout & Pages" section
- AND `useAppManifest` MUST appear under the "Available Composables" section
- AND the manifest JSON shape MUST be documented with an example

---

### Requirement: REQ-JMR-008 — Unit Tests

All new units MUST have corresponding tests.

**Test files:**
- `tests/components/CnAppRoot.spec.js`
- `tests/components/CnAppNav.spec.js`
- `tests/components/CnPageRenderer.spec.js`
- `tests/components/CnAppLoading.spec.js`
- `tests/components/CnDependencyMissing.spec.js`
- `tests/composables/useAppManifest.spec.js`
- `tests/composables/useAppStatus.spec.js`
- `tests/schemas/app-manifest.schema.spec.js`

#### Scenario: CnAppRoot provides manifest to child

- GIVEN a mounted `CnAppRoot` with a manifest prop
- WHEN a child component calls `inject('cnManifest')`
- THEN the injected value MUST match the manifest prop

#### Scenario: useAppManifest falls back on invalid BE response

- GIVEN a mocked axios that returns an invalid manifest (bad type field)
- WHEN `useAppManifest` runs
- THEN `manifest.value` MUST equal the bundled manifest (not the invalid one)
- AND `validationErrors.value` MUST be non-null

#### Scenario: CnPageRenderer renders nothing for unrecognised route

- GIVEN `$route.name = 'unknown'` and manifest has no matching page
- WHEN CnPageRenderer renders
- THEN the output MUST be empty and `console.warn` MUST have been called

#### Scenario: Schema test file validates all fixtures

- GIVEN fixture manifests in `tests/fixtures/` (one valid, one invalid)
- WHEN each is validated against `app-manifest.schema.json`
- THEN the valid fixture MUST pass and the invalid fixture MUST fail

---

### Requirement: REQ-JMR-009 — NL Design System Compatibility

All new components MUST use Nextcloud CSS variables exclusively.

#### Scenario: No nldesign variable references

- GIVEN the source of `CnAppRoot.vue`, `CnAppNav.vue`, `CnPageRenderer.vue`, `CnAppLoading.vue`, `CnDependencyMissing.vue`
- WHEN scanned for CSS variable references
- THEN NO reference to `--nldesign-*` variables MUST exist
- AND all color, border, and spacing values MUST use `var(--color-*)`, `var(--border-radius)`, or `var(--default-grid-baseline)` tokens

---

### Requirement: REQ-JMR-010 — CnAppLoading: Full-Page Loading Screen

`CnAppLoading` MUST be a Vue 2 Options API component providing a full-page centered loading screen displayed by `CnAppRoot` while `useAppManifest.isLoading === true`.

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `message` | String | no | `'Loading...'` | Loading message text (plain string; library does not import `t()`). |
| `logoUrl` | String | no | `''` | Optional URL to an app logo image shown above the spinner. |

**Slots:**
- `#logo` — Override the logo area entirely.

**Template:** Centered `NcLoadingIcon` with optional logo above and optional message below. Uses Nextcloud CSS variables for colors and spacing.

#### Scenario: CnAppLoading renders spinner with default message

- GIVEN `CnAppLoading` is mounted with no props
- WHEN rendered
- THEN an `NcLoadingIcon` MUST be present in the output
- AND the text `'Loading...'` MUST be visible

#### Scenario: CnAppLoading accepts a custom message

- GIVEN `CnAppLoading` is mounted with `message="Initialising app..."`
- WHEN rendered
- THEN the text `'Initialising app...'` MUST be visible

#### Scenario: CnAppLoading accepts a #logo slot override

- GIVEN `CnAppLoading` is mounted with a `#logo` slot containing `<img src="/custom.svg" />`
- WHEN rendered
- THEN the custom `<img>` MUST appear in the output

---

### Requirement: REQ-JMR-011 — CnDependencyMissing: Dependency-Check Screen

`CnDependencyMissing` MUST be a Vue 2 Options API component providing a full-page screen displayed by `CnAppRoot` when one or more manifest dependencies are not installed or not enabled.

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `dependencies` | Array | yes | — | Array of `{ id: string, name: string, installUrl?: string, enabled: boolean }` describing the missing/disabled apps. |
| `appName` | String | no | `''` | The host app's display name. Used in the heading. |

**Template:** A list of missing apps. For each dependency: show its `name`; if `!enabled` (installed but disabled) show an enable link to `/index.php/settings/apps`; if not installed show an install link. Uses Nextcloud CSS variables.

#### Scenario: CnDependencyMissing lists missing dependencies

- GIVEN `CnDependencyMissing` is mounted with `dependencies=[{ id: 'openregister', name: 'OpenRegister', enabled: false }]`
- WHEN rendered
- THEN the text `'OpenRegister'` MUST be visible
- AND a link to `/index.php/settings/apps` MUST be present

#### Scenario: CnDependencyMissing shows install link for not-installed dependency

- GIVEN `dependencies=[{ id: 'openregister', name: 'OpenRegister', installUrl: '/index.php/settings/apps/app-details/openregister', enabled: false }]`
- WHEN rendered
- THEN the install/enable link MUST use the provided `installUrl`

---

### Requirement: REQ-JMR-012 — useAppStatus Composable

`useAppStatus(appId)` MUST check whether the given Nextcloud app is installed and enabled. The composable is generic — it works for any app id (`openregister`, `opencatalogi`, etc.).

**Signature:** `useAppStatus(appId: string): { installed: Ref<boolean>, enabled: Ref<boolean>, loading: Ref<boolean> }`

**Behaviour:**
- Uses `@nextcloud/capabilities` (or OCS apps endpoint as fallback) to determine status by checking whether the capabilities response contains a key matching `appId`
- Results are cached per `appId` for the page lifetime (no re-fetching on repeated calls with the same `appId`)
- On error: defaults to `{ installed: false, enabled: false }` and logs `console.warn`
- `loading` starts `true`, becomes `false` once the check completes

#### Scenario: Returns installed=true when given app's capability is present

- GIVEN `@nextcloud/capabilities` returns capabilities that include an `openregister` key
- WHEN `useAppStatus('openregister')` is called
- THEN `installed.value` MUST be `true` and `enabled.value` MUST be `true` after loading completes

#### Scenario: Returns installed=false when given app's capability is absent

- GIVEN `@nextcloud/capabilities` returns capabilities with no `opencatalogi` key
- WHEN `useAppStatus('opencatalogi')` is called
- THEN `installed.value` MUST be `false` after loading completes

#### Scenario: Caches result per appId for the page lifetime

- GIVEN `useAppStatus('openregister')` has been called and resolved
- WHEN `useAppStatus('openregister')` is called a second time on the same page
- THEN no additional network request MUST be made
- AND the returned refs MUST reflect the cached values immediately
- AND a separate call to `useAppStatus('opencatalogi')` MUST trigger its own fetch (caches are per-appId)

#### Scenario: Returns safe defaults on capabilities error

- GIVEN the capabilities API call throws an error
- WHEN `useAppStatus('openregister')` is called
- THEN `installed.value` MUST be `false`
- AND `console.warn` MUST have been called

---

### Requirement: REQ-JMR-013 — CnAppRoot Phase Orchestration

`CnAppRoot` MUST implement a three-phase rendering sequence: **loading → dependency-check → shell**.

**Phase logic:**
1. **Loading phase** — while `useAppManifest.isLoading === true`: render `#loading` slot (default: `<CnAppLoading />`). Shell is not rendered.
2. **Dependency-check phase** — after loading; for each entry in `manifest.dependencies`, call `useAppStatus(appId)`. If any dependency is missing/disabled: render `#dependency-missing` slot (default: `<CnDependencyMissing :dependencies="unresolvedDeps" />`). Shell is not rendered.
3. **Shell phase** — all dependencies satisfied: render `#menu` slot (default: `<CnAppNav :permissions="permissions" />`) + `<router-view />` + optional `#header-actions`, `#sidebar`, `#footer` slots.

All slots are independently overridable by the consuming app.

#### Scenario: CnAppRoot renders loading slot during manifest load

- GIVEN `useAppManifest.isLoading === true`
- WHEN `CnAppRoot` renders
- THEN the `#loading` slot content MUST be rendered
- AND neither the menu nor router-view MUST be present

#### Scenario: CnAppRoot renders dependency-missing slot when dependency absent

- GIVEN manifest loaded successfully and `manifest.dependencies = ['openregister']`
- AND `useAppStatus('openregister')` returns `{ installed: false }`
- WHEN `CnAppRoot` renders
- THEN the `#dependency-missing` slot content MUST be rendered
- AND neither the menu nor router-view MUST be present

#### Scenario: CnAppRoot renders shell when all dependencies satisfied

- GIVEN manifest loaded and all dependencies installed/enabled
- WHEN `CnAppRoot` renders
- THEN the `#menu` slot (default `CnAppNav`) MUST be present
- AND `<router-view>` MUST be present

#### Scenario: Overriding #loading slot replaces CnAppLoading

- GIVEN `CnAppRoot` has a `#loading` slot with `<MySpinner />`
- AND `useAppManifest.isLoading === true`
- WHEN `CnAppRoot` renders
- THEN `<MySpinner />` MUST render and `CnAppLoading` MUST NOT render

---

## MODIFIED Requirements

None — this capability is entirely new. No existing spec requirements are changed. Note: `CnIndexPage` and `CnDetailPage` gain additive `#header` and `#actions` slots (see task 3.4); no existing consumers are affected.

## REMOVED Requirements

None.

---

## Resolved Decisions

All deferred questions raised during artifact generation and the post-review patch pass have been resolved by the user:

- `useAppManifest` accepts `bundledManifest` as an explicit argument (not dynamic import). See REQ-JMR-002.
- `CnAppNav` supports one level of `children[]` nesting. Deeper nesting is a non-breaking future extension. See REQ-JMR-004.
- `CnPageRenderer` forwards `config.*` fields as individual props matching existing page component interfaces (no breaking changes to `CnIndexPage`/`CnDetailPage`/`CnDashboardPage`). See REQ-JMR-005.
- The JSON Schema's `$id` is the GitHub raw URL on the `main` branch — `https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest.schema.json`. Resolves today; updates with each merge to `main`.
- The dependency-check composable is generalised as `useAppStatus(appId)` rather than `useAppStatus`. Cached per `appId` for the page lifetime. See REQ-JMR-012.
