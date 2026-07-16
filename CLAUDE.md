# @conduction/nextcloud-vue — Agent Instructions

## What This Library Is

A shared Vue 2 component library for Conduction Nextcloud apps that:
- **Complements** @nextcloud/vue with higher-level components (data tables, list layouts, filter bars)
- **Supports** NL Design System theming (via the nldesign app which overrides Nextcloud CSS variables)
- **Includes** a generic Pinia store for OpenRegister CRUD operations
- **Provides** composables for common list/detail view patterns

## Using Components

Always check this library BEFORE building custom components. Import from the barrel:

```js
import { CnDataTable, CnPagination, CnStatusBadge } from '@conduction/nextcloud-vue'
import { useObjectStore } from '@conduction/nextcloud-vue'
import '@conduction/nextcloud-vue/src/css/index.css'
```

Consumer apps MUST also call `registerTranslations()` once in `main.js` (alongside `registerIcons({})`) **before** `new Vue().$mount(...)` — without it, library-rendered strings stay in English even when the user's Nextcloud language is Dutch. See [docs/getting-started.md](docs/getting-started.md#register-library-translations-required).

### Available Components

**Layout & Pages**
- `CnIndexPage` — Top-level schema-driven index page (table/cards, pagination, mass actions, dialogs). Overridable via `#header` and `#actions` slots.
- `CnDetailPage` — Generic detail/overview page with stats table and flexible content slots. Overridable via `#header` and `#actions` slots.
- `CnPageHeader` — Page header with icon, title, description
- `CnActionsBar` — Action bar with add button, mass actions, view toggle, search

**Manifest Renderer (JSON-driven app shell)**
- `CnAppRoot` — Top-level app wrapper. Orchestrates loading → dependency-check → shell phases. Provides `cnManifest`, `cnCustomComponents`, `cnTranslate` to descendants. Slots: `#loading`, `#dependency-missing`, `#menu`, `#header-actions`, `#sidebar`, `#footer` — each independently overridable. Use this when adopting the full manifest pattern; lower tiers (just `useAppManifest`, or `+ CnPageRenderer`, or `+ CnAppNav`) are also supported.
- `CnAppNav` — Manifest-driven `NcAppNavigation`. Reads `manifest.menu[]`; sorts by `order`; filters by `permission`; one level of `children[]`. Accepts `manifest`, `translate`, `permissions` as props (with inject fallback) for standalone use.
- `CnPageRenderer` — Type dispatcher mounted inside `<router-view>`. Matches `$route.name === page.id`, dispatches by `page.type` (`index | detail | dashboard | custom`) using `defineAsyncComponent` for tree-shaking. Forwards `page.config` as props; resolves `page.headerComponent` / `page.actionsComponent` against the customComponents registry.
- `CnAppLoading` — Default loading screen (logo slot + NcLoadingIcon + message). Used by CnAppRoot's `#loading` phase.
- `CnDependencyMissing` — Default dependency-missing screen (lists missing apps with install/enable links). Used by CnAppRoot's `#dependency-missing` phase.

**Data Display**
- `CnDetailGrid` — Data-driven label-value grid with grid and horizontal layout modes
- `CnDataTable` — Sortable data table with selection, loading, empty states
- `CnCardGrid` — Grid of object cards
- `CnObjectCard` — Single object card
- `CnCellRenderer` — Cell value formatter for tables
- `CnFilterBar` — Search + filter controls row
- `CnFacetSidebar` — Faceted filter sidebar
- `CnPagination` — Full pagination with page numbers and size selector

**Single-Object Dialogs** (emit-based, two-phase confirm → result)
- `CnDeleteDialog` — Single-item delete confirmation
- `CnCopyDialog` — Single-item copy with naming pattern selector
- `CnFormDialog` — Schema-driven create/edit form dialog (auto-generates fields, supports async select via `enum` function, per-field option slot overrides)
- `CnAdvancedFormDialog` — Richer create/edit dialog with properties table (click-to-edit), Data (JSON) tab with CodeMirror, optional Metadata tab; optional useObjectStore integration; fixed large size
- `CnSchemaFormDialog` — Full-featured JSON Schema editor dialog with Properties (sortable table, inline editing), Configuration (composition, field mappings), and Security (RBAC) tabs. Accepts external data as props (availableSchemas, availableRegisters, userGroups, availableTags). Optional action buttons (extend, analyze, validate, delete objects, publish, delete) controlled via boolean props that emit events.

**Mass-Action Dialogs** (emit-based, two-phase confirm → result)
- `CnMassDeleteDialog` — Bulk delete confirmation
- `CnMassCopyDialog` — Bulk copy with naming patterns
- `CnMassExportDialog` — Bulk export with format selection
- `CnMassImportDialog` — Bulk import with file upload

**Data Viewers**
- `CnJsonViewer` — Syntax-highlighted code viewer/editor with CodeMirror (supports JSON, XML, HTML, plain text via `language` prop with `'auto'` detection; readOnly mode)

**UI Elements**
- `CnStatusBadge` — Color-coded status/priority pill badge
- `CnDetailCard` — Card container with title, icon, collapsible sections
- `CnRowActions` — Row action buttons (inline + overflow dropdown)
- `CnContextMenu` — Right-click context menu (wraps NcActions, pair with `useContextMenu` composable)
- `CnMassActionBar` — Floating bar for mass action triggers
- `CnIcon` — MDI icon by name
- `CnKpiGrid` — KPI metric cards grid
- `CnStatsPanel` — Data-driven statistics panel (sections of stat blocks, list items, and progress bars)
- `CnProgressBar` — Labeled horizontal progress bars with variant colors for distribution visualizations
- `CnIndexSidebar` — Index page sidebar

**Object Widgets**
- `CnObjectDataWidget` — Schema-driven editable data grid widget. Displays object properties in a CSS grid, supports inline editing (click-to-edit with all widget types), dirty tracking, and saves via objectStore. Configurable per-property overrides for order, grid span, visibility, editability, label, and widget type.
- `CnObjectMetadataWidget` — Read-only metadata display widget. Automatically extracts and formats system metadata from OpenRegister objects (@self block: id, uuid, uri, register, schema, created, updated, owner, etc.). Supports include/exclude filters and extra items.

**Dashboard**
- `CnDashboardPage` — Top-level dashboard page with GridStack widget grid (the dashboard equivalent of CnIndexPage)
- `CnDashboardGrid` — Low-level GridStack grid layout engine (drag/drop, resize)
- `CnWidgetWrapper` — Widget container shell with header, content area, footer
- `CnWidgetRenderer` — Renders Nextcloud Dashboard API widgets (v1/v2) with auto-refresh
- `CnTileWidget` — Quick-access tile with icon and link (SVG, class, URL, emoji icons)

**Settings**
- `CnSettingsCard` — Collapsible settings card
- `CnSettingsSection` — Settings section container
- `CnStatsBlock` — Stats display with count and breakdown
- `CnConfigurationCard` — Configuration card with status and actions
- `CnVersionInfoCard` — Version info display card
- `CnRegisterMapping` — Register mapping configuration

### Available Utilities
- `columnsFromSchema(schema, options)` — Generate table column definitions from JSON Schema
- `filtersFromSchema(schema, options)` — Generate filter definitions from JSON Schema
- `fieldsFromSchema(schema, options)` — Generate form field definitions from JSON Schema (used by CnFormDialog)
- `formatValue(value, format)` — Format cell values for display
- `buildHeaders()` — Build API request headers
- `buildQueryString(params)` — Build URL query string from params object
- `parseResponseError(response)` — Extract error message from API response
- `networkError()` / `genericError()` — Standard error message helpers
- `validateManifest(manifest)` — Validate an app manifest against the JSON Schema. Returns `{ valid, errors }`. Use at build time or in test fixtures; the same validator runs at runtime inside `useAppManifest`.

### Available Store
- `useObjectStore` — Generic Pinia store for OpenRegister objects (CRUD, pagination, search, caching)
- `createObjectStore(id)` — Factory to create store with custom ID

### Available Composables
- `useListView(options)` — Search debounce, filter state, sort, pagination
- `useDetailView(options)` — Load, edit, delete state management
- `useFileSelection(options)` — File upload/drop handling
- `useDashboardView(options)` — Dashboard state: widget defs, layout, NC widget loading, add/remove/persist
- `useContextMenu()` — Right-click context menu positioning and state (cursor CSS vars, open/close, action helpers)
- `useAppManifest(appId, bundledManifest, options?)` — Load + validate the app manifest. Returns `{ manifest, isLoading, validationErrors }`. Synchronous bundled load + async backend-merge stub (silent fallback on 4xx / network errors); validates via `validateManifest`. Pass `options.endpoint` or `options.fetcher` to override the backend URL or inject a mock.
- `useAppStatus(appId)` — Check whether a Nextcloud app is installed and enabled via `@nextcloud/capabilities`. Returns `{ installed, enabled, loading }`. Cached per appId for the page lifetime. CnAppRoot calls this once per `manifest.dependencies` entry to drive the dependency-check phase.
- `useIntegrationRegistry()` — Reactive view onto the pluggable integration registry. Returns `{ integrations, getById, resolveWidget, registry }`. `integrations` is a `ComputedRef<object[]>` sorted by `order` ascending then `id`. Used by `CnObjectSidebar`, `CnDashboardPage`, and `CnDetailPage` to render integration tabs/widgets that consuming apps register at bootstrap. See "Pluggable Integration Registry" below.

### Pluggable Integration Registry

OpenRegister exposes a JS registry on `window.OCA.OpenRegister.integrations`. Consuming apps register tabs and widgets that surface in `CnObjectSidebar` (per-object tab strip), `CnDashboardPage` (configurable widget grid), and `CnDetailPage` (object detail). Registration is reactive — late-loaded apps still cause mounted components to re-render.

**Where it lives:**
- `src/integrations/registry.js` — `createIntegrationRegistry()` factory + default `integrations` singleton + `installIntegrationRegistry(window)` for installing onto the global plus draining queued stub registrations
- `src/composables/useIntegrationRegistry.js` — Vue 2.7 composable wrapping the singleton in a reactive snapshot

**Registering an integration (from a consuming app's bootstrap):**
```js
import CnCalendarTab from './CnCalendarTab.vue'
import CnCalendarCard from './CnCalendarCard.vue'

OCA.OpenRegister.integrations.register({
    id: 'calendar',
    label: t('myapp', 'Meetings'),
    icon: 'Calendar',              // MDI name
    requiredApp: 'calendar',
    order: 10,
    group: 'comms',                // optional: 'core' | 'comms' | 'docs' | 'workflow' | 'external'
    referenceType: 'calendar',     // marker for schema reference properties (AD-18)
    tab: CnCalendarTab,            // REQUIRED — sidebar tab component
    widget: CnCalendarCard,        // REQUIRED — receives `surface` prop at render
    widgetCompact: CnCalendarMini, // optional override for surface='user-dashboard'
    widgetExpanded: CnCalendarFull,// optional override for surface='detail-page'
    widgetEntity: CnCalendarChip,  // optional override for surface='single-entity'
    defaultSize: { w: 3, h: 3 },
})
```

**Surface fallback (AD-19):** any surface without a dedicated component falls back to `widget` with `surface` passed as a prop, so simple integrations don't need three components. Surface registry: `'user-dashboard' | 'app-dashboard' | 'detail-page' | 'single-entity'`.

**Collision policy (AD-13):** duplicate `id` throws synchronously in development (`NODE_ENV !== 'production'`) and warns + keeps the first registration in production.

**Parity contract:** `tab` and `widget` are required. Registering without them throws. A CI parity gate (`scripts/check-integration-parity.sh`) catches missing declarations pre-merge.

**Bootstrap-order safety:** if a consuming app's bundle loads before OpenRegister's, install a stub before any `register()` calls and OpenRegister will replay the queue when its main bundle initialises:
```js
window.OCA = window.OCA || {}
window.OCA.OpenRegister = window.OCA.OpenRegister || {}
window.OCA.OpenRegister.integrations = window.OCA.OpenRegister.integrations || {
    _queue: [],
    register(entry) { this._queue.push(entry) },
}
```

**Reading the registry (in components):**
```js
import { useIntegrationRegistry } from '@conduction/nextcloud-vue'

setup() {
    const { integrations, getById, resolveWidget } = useIntegrationRegistry()
    return { integrations, getById, resolveWidget }
}
```
The `integrations` ref is sorted and reactive. Use `resolveWidget(id, surface)` to apply the AD-19 fallback rule when rendering a specific surface.

**Surface components consume the registry (all opt-in, backwards-compatible):**

- **`CnObjectSidebar`** — `useRegistry` (Boolean, default `false`): replace the hardcoded built-in tabs with one tab per registered provider. `excludeIntegrations` (`string[]`) and `hiddenTabs` filter the set. Mutually exclusive with the open-enum `tabs` prop (`tabs` wins, with a console.warn). Per-integration slot overrides aren't supported in registry mode — override a built-in by registering your own provider with the same id (collision policy: first wins).
- **`CnDetailPage`** — the `sidebar` Object form accepts `useRegistry: true` and `excludeIntegrations: string[]` (mutually exclusive with `tabs`); `CnDetailPage` pushes both into the injected `objectSidebarState`. The host app's `#sidebar` slot — the place that actually mounts `<CnObjectSidebar>` reading `objectSidebarState` — must bind them through: `:use-registry="objectSidebarState.useRegistry"` and `:exclude-integrations="objectSidebarState.excludeIntegrations"` (alongside the `tabs`/`hiddenTabs`/`register`/`schema` it already binds). With that wiring, a manifest detail page can flip its sidebar to registry mode purely declaratively via `pages[].config.sidebar.useRegistry: true`.
- **`CnDashboardPage`** / **`CnDetailPage`** — add an `integration` widget type to the layout: `{ id, title, type: 'integration', integrationId, props? }`. The component is resolved from the registry via `resolveWidget(integrationId, surface)`. `surface` prop defaults to `'app-dashboard'` (dashboard) / `'detail-page'` (detail). `integrationContext` prop (`{ register, schema, objectId }`) is forwarded to the widget — `CnDetailPage` derives it from `sidebarProps` + `objectId` when not given.
- **`CnFormDialog`** / **`CnDetailGrid`** — a schema property (or detail item) carrying `referenceType: '<integration-id>'` (AD-18) renders that integration's single-entity widget (AD-19 fallback to its main `widget`) instead of a plain input/value. `referenceContext` prop (`{ register, schema, objectId }`) is forwarded. A consumer `#field-<key>` / `#item-<index>` slot still overrides it.

### CnIndexPage Dialog Override System

CnIndexPage has built-in single-object dialogs (Delete, Copy, Form) that are **overridable at three levels**:

1. **Full dialog replacement** via named slots:
   - `#delete-dialog="{ item, close }"` — Replace delete dialog
   - `#copy-dialog="{ item, close }"` — Replace copy dialog
   - `#form-dialog="{ item, schema, close }"` — Replace create/edit dialog (use CnFormDialog or CnAdvancedFormDialog)
2. **Form content override** — `#form-fields` replaces the form inside the built-in CnFormDialog
3. **Per-field override** — `#field-{key}` inside CnFormDialog replaces a single field. For JSON / code-editor fields this slot is rarely needed: set `widget: 'json'` (structured value, parses on input) or `widget: 'code'` (raw string + `field.language` for highlighting) on the schema property and CnFormDialog renders `CnJsonViewer` automatically.
4. **Per-field option rendering** — `#field-{key}-option` and `#field-{key}-selected-option` customize dropdown option display for select/multiselect/tags fields

Key events emitted by CnIndexPage:
- `@create(formData)` — Form dialog create confirmed
- `@edit(formData)` — Form dialog edit confirmed
- `@delete(id)` — Single delete confirmed
- `@copy({ id, newName })` — Single copy confirmed
- `@mass-delete(ids)`, `@mass-copy(payload)`, `@mass-export(payload)`, `@mass-import(payload)`

Public ref methods for setting dialog results:
- `setFormResult(resultData)`, `setSingleDeleteResult(resultData)`, `setSingleCopyResult(resultData)`
- `setMassDeleteResult(resultData)`, `setMassCopyResult(resultData)`, `setExportResult(resultData)`, `setImportResult(resultData)`
- `openFormDialog(item)` — Programmatic open (null = create, object = edit)

### CnDashboardPage Widget System

CnDashboardPage renders a configurable grid of widgets. Three widget types:

1. **Custom** — App provides rendering via `#widget-{widgetId}` scoped slot
2. **NC Dashboard API** — Widgets with `itemApiVersions` auto-rendered via CnWidgetRenderer
3. **Tile** — Widgets with `type: 'tile'` render as quick-access link tiles

**Props:**
- `widgets` — Array of widget definitions: `{ id, title, type, iconUrl?, iconClass?, itemApiVersions?, ... }`
- `layout` — Array of grid placements: `{ id, widgetId, gridX, gridY, gridWidth, gridHeight, showTitle? }`
- `title`, `description`, `loading`, `allowEdit`, `columns` (default 12), `cellHeight` (default 80)
- `editLabel`, `doneLabel`, `emptyLabel`, `unavailableLabel` — Pre-translated UI strings

**Events:** `@layout-change(layout)`, `@edit-toggle(isEditing)`

**Slots:**
- `#header-actions` — Extra buttons in the header (right side)
- `#widget-{widgetId}="{ item, widget }"` — Custom widget content
- `#empty` — Custom empty state

**Composable: `useDashboardView(options)`:**
- `options.widgets` — Static widget defs
- `options.defaultLayout` — Default layout
- `options.loadLayout` / `options.saveLayout` — Async persist functions
- `options.includeNcWidgets` — Also load NC Dashboard API widgets
- Returns: `{ widgets, layout, loading, saving, onLayoutChange, addWidget, removeWidget }`

**Implementation pattern for apps (layout stored in app config):**
```js
// Define widgets
const WIDGETS = [
  { id: 'kpis', title: 'Key Metrics', type: 'custom' },
  { id: 'chart', title: 'Chart', type: 'custom' },
]
// Define default layout
const DEFAULT_LAYOUT = [
  { id: 1, widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, showTitle: false },
  { id: 2, widgetId: 'chart', gridX: 0, gridY: 2, gridWidth: 6, gridHeight: 4 },
]
// In template
<CnDashboardPage :widgets="WIDGETS" :layout="layout" @layout-change="saveLayout">
  <template #widget-kpis="{ item }"><MyKpis /></template>
  <template #widget-chart="{ item }"><MyChart /></template>
</CnDashboardPage>
```

### JSON Manifest Renderer

Apps can declare their entire shell — routes, navigation, page configuration, dependencies — in a single `src/manifest.json`. The library reads it and renders the app. Adoption is incremental (four tiers from "just `useAppManifest`" to "full `CnAppRoot` shell"); a custom menu component can replace the default `CnAppNav` via the `#menu` slot.

Minimal manifest:

```json
{
  "$schema": "https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest.schema.json",
  "version": "1.0.0",
  "dependencies": ["openregister"],
  "menu": [
    { "id": "decisions", "label": "myapp.menu.decisions", "icon": "icon-checkmark", "route": "decisions-index", "order": 10 }
  ],
  "pages": [
    { "id": "decisions-index", "route": "/decisions", "type": "index", "title": "myapp.decisions.title",
      "config": { "register": "decisions", "schema": "decision", "columns": ["title", "status"] } },
    { "id": "decisions-detail", "route": "/decisions/:id", "type": "detail", "title": "myapp.decisions.detail",
      "config": { "register": "decisions", "schema": "decision" } },
    { "id": "settings", "route": "/settings", "type": "custom", "title": "myapp.settings.title", "component": "SettingsPage" }
  ]
}
```

`page.id` is also the vue-router route name; CnPageRenderer matches by `$route.name === page.id`. The `type` enum is closed (`index | detail | dashboard | custom`) — bespoke pages use `type: "custom"` with a registry component.

See `examples/manifest-demo/manifest.json` for a fuller reference and `docs/migrating-to-manifest.md` for tier-by-tier adoption guidance.

## Rules for Modifying Components

1. **NEVER break existing prop interfaces** — new props MUST have defaults
2. **NEVER remove props, events, or slots** — deprecate with console.warn instead
3. **Always maintain backwards compatibility** — existing consumers must not break
4. **Always ask the user before upgrading a component** — propose changes via discussion first
5. **Run `npm test` before submitting changes**
6. **CSS class prefix**: All classes use `cn-` prefix to avoid collisions
7. **Theming**: Use Nextcloud CSS variables only (`var(--color-primary-element)`, `var(--color-border)`, etc.). Do NOT reference `--nldesign-*` variables — the nldesign app overrides Nextcloud's own variables, so theming works automatically.
8. **Always update docs when you add, rename, or remove a prop, event, or slot** — edit `docs/components/cn-<component>.md` in the same change. The CI `check:docs` step (run via `npm run check:docs`) verifies both that a doc file exists AND that every SFC prop and named slot appears in it. Run it locally before committing to catch gaps.

## Adding New Components

1. Create directory: `src/components/CnMyComponent/`
2. Create Vue SFC with `name: 'CnMyComponent'`
3. Add JSDoc to every prop, event, slot, and method
4. Add `index.js` re-export
5. Add to `src/components/index.js` barrel
6. Add to `src/index.js` barrel
7. Write test in `tests/components/`
8. Use Nextcloud CSS variables only (no `--nldesign-*` references)
9. **Write a docs page** at `docs/components/cn-my-component.md` — see the next section. The `check:docs` script fails CI when any public export is undocumented.

## Documentation Coverage (enforced)

Every identifier re-exported from `src/index.js` must have corresponding documentation. This is enforced by [scripts/check-docs.js](scripts/check-docs.js), wired up as:

```bash
npm run check:docs
```

The script parses `src/index.js`, classifies each named export, and verifies that a matching doc file (or symbol mention) exists under `docs/`. It exits non-zero with a per-category breakdown when anything is missing. Run it before committing any change that adds, renames, or removes a public export.

### Export → doc location mapping

| Category | Match rule | Expected doc |
|----------|-----------|--------------|
| Components | `Cn*` PascalCase | `docs/components/<kebab>.md` |
| Composables | `use*` (not in the store factory list) | `docs/utilities/composables/<kebab>.md` |
| Store factories | `useObjectStore`, `createObjectStore`, `createCrudStore`, `createSubResourcePlugin` | `docs/store/<stem>.md` — stem strips the leading `use`/`create` verb (→ `object-store.md`, `crud-store.md`, `sub-resource-plugin.md`) |
| Store plugins | `*Plugin` suffix | `docs/store/plugins/<kebab>.md` (e.g. `auditTrailsPlugin` → `audit-trails.md`) |
| Store constants | See `STORE_MENTION_ONLY` | Mention-by-name inside an existing `docs/store/*.md` — no standalone file required |
| Utilities | Any other export | `docs/utilities/<kebab>.md` |

`<kebab>` is the camelCase/PascalCase export name converted to kebab-case by the script's `toKebab()` helper.

### Configuring the script

Three constants at the top of [scripts/check-docs.js](scripts/check-docs.js) control the edge cases — each has an inline JSDoc block explaining its purpose in detail:

- **`EXEMPT`** — Set of export names that don't need a dedicated doc page. Reserved for lifecycle/bootstrap helpers covered by another doc (currently only `registerIcons`, documented as part of the install flow). Exempt exports are skipped entirely and don't count toward any category's totals.

- **`STORE_FACTORY_STEMS`** — Map of store factory/helper identifiers to their doc filename stem under `docs/store/`. Used to override the default kebab-case rule so the docs read as `object-store.md` / `crud-store.md` instead of `use-object-store.md` / `create-crud-store.md`. Multiple identifiers may map to the same stem (e.g. `useObjectStore` and `createObjectStore` both point at `docs/store/object-store.md`).

- **`STORE_MENTION_ONLY`** — Map of export names to the `.md` file (relative to `docs/store/`) that's required to mention them by name. Used for constants and small helpers that belong with a larger API and don't warrant their own page (e.g. `SEARCH_TYPE` is checked inside `docs/store/plugins/search.md`). Coverage passes when the file exists and contains the symbol name as a substring.

When adding a new public export that doesn't fit the default rules:

- If it's one of a small set of helpers for an existing page → add it to `STORE_MENTION_ONLY` and ensure the target doc references it by name.
- If the default kebab-case → filename mapping produces an awkward stem → add an entry to `STORE_FACTORY_STEMS` (store-related) or extend `classify()` with a new category for other surfaces.
- If it's truly a non-API export (build-time helper, registration hook) → add it to `EXEMPT`. Use this sparingly.

### Running the check

```bash
# From nextcloud-vue/
npm run check:docs      # exits 0 when every export is covered, 1 otherwise
```

Output is a per-category coverage summary followed by a list of missing exports with the exact file path the script expects, so the fix is always to either create that file or rename an existing one.

## Documenting components (enforced)

The library's docs site auto-generates per-component reference tables (props / events / slots) from JSDoc on the SFCs via `vue-docgen-cli`. **Components update → docs update automatically** — but only when the JSDoc is rich enough to be useful. Two CI gates enforce this:

1. **Freshness** — `cd docusaurus && npm run prebuild:docs` is run in CI; if it produces a diff against `docs/components/_generated/`, the build fails. Solution: run the same command locally and commit the diff.
2. **Completeness ratchet** — `npm run check:jsdoc` scores each `Cn*` on prop / event / slot JSDoc coverage and compares against the per-component baseline at [scripts/.jsdoc-baselines.json](scripts/.jsdoc-baselines.json). CI fails on any regression. New components require 100% coverage from day one. Improving coverage is a normal PR — bump the baseline with `npm run jsdoc-baselines:update`.

### Three canonical JSDoc shapes

**Prop:** leading `/** ... */` block. For non-trivial union or generic types, an `@type {...}` tag (vue-docgen-cli infers simple types from the `type:` field).

```vue
<script>
export default {
  props: {
    /**
     * Column definitions (manual mode). Not required when `schema` is provided.
     * @type {Array<{key: string, label: string, sortable: boolean, width: string}>}
     */
    columns: { type: Array, default: () => [] },
  },
}
</script>
```

**Event:** JSDoc above the `$emit` site. The `@event` tag preserves the event's name across vue-docgen-api's parser; payload shape goes in `@type`.

```vue
/**
 * @event sort Emitted when a sortable column header is clicked.
 * @type {{ key: string|null, order: 'asc'|'desc'|null }}
 */
this.$emit('sort', { key: newKey, order })
```

**Named slot:** template comment immediately above the `<slot>` declaration. Scoped slots add `@binding` per scope key.

```vue
<template>
  <!-- @slot row-actions Per-row action menu cell. Receives the row object. -->
  <!-- @binding {object} row The row data passed to slot consumers. -->
  <slot name="row-actions" :row="row" />
</template>
```

### Workflow when adding or modifying a component

1. Edit the SFC. Add / update JSDoc as you touch each prop, event, or slot.
2. `git add src/components/CnX/CnX.vue` then `git commit`.
   The **husky pre-commit hook** (`.husky/pre-commit` → `scripts/precommit-regenerate-partials.sh`) detects the staged Cn* SFC, runs `npm run prebuild:docs` for you, and auto-stages the regenerated `docs/components/_generated/<name>.md`. The commit lands SFC + partial atomically.
3. If the hook is skipped (e.g. `cd docusaurus && npm install --legacy-peer-deps` hasn't run yet — the script prints a one-line hint and exits 0), CI's freshness gate in `code-quality.yml` still catches the stale partial. Run `cd docusaurus && npm run prebuild:docs && git add docs/components/_generated/` manually before pushing.
4. Run `npm run check:jsdoc` locally to confirm no regression below the baseline.
5. If you intentionally improved coverage, `npm run jsdoc-baselines:update` and commit the bumped baseline.

The CI failure messages cite the component name, the missing items by `kind:name`, and the file path — so the fix is always "open the SFC, add the JSDoc, commit."

## Project Structure

```
src/
  index.js              # Main barrel export — source of truth for public API
  components/           # Vue SFC components (CnPrefixed)
  store/                # Pinia stores
  composables/          # Vue composables
  css/                  # Global CSS modules
  utils/                # Utility functions
docs/
  components/           # One .md per component (cn-<kebab>.md)
  store/                # Store factories + plugins/ subdir
  utilities/            # Utility functions + composables/ subdir
scripts/
  check-docs.js         # Enforces docs coverage for every src/index.js export
```

## Consumer Apps

This library is used by: OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash.
Changes here affect all of them. Test carefully.

Every consumer's `main.js` must include:

```js
import { registerIcons, registerTranslations } from '@conduction/nextcloud-vue'
registerIcons({ /* app-specific icons */ })
registerTranslations()
```

`registerTranslations()` is a required bootstrap call — without it, the library falls back to English regardless of the user's Nextcloud language.
