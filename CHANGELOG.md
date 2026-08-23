# Changelog

## [Unreleased]

### Added
- Optional top-level `mcp` block in the v2 app manifest schema (`src/schemas/app-manifest-v2.schema.json`) — advisory MCP tool visibility/UX hints (`expose`, `pageTools`, `agentHints`) per ADR-063. Purely presentational: OpenRegister's register + RBAC remain the sole source of CRUD-tool truth and invoke-time authority; nothing in `nextcloud-vue` reads `manifest.mcp`. Fully optional and additive — existing manifests validate unchanged
- `CnAppRoot` `dataSourcesLoader` prop — an async `() => ({ registers })` re-invoked every time a pages-editor modal opens, so a register or schema created after app boot appears without a page reload. Feeds a stable reactive `cnDataSourcesState` holder (provided **by reference** and mutated in place, so the one-shot `provide()` still observes updates) plus a provided `cnRefreshDataSources()` action that de-dupes concurrent refreshes and keeps the last good list on failure. The existing `dataSources` prop and `cnDataSources` provide key are unchanged — a consumer passing only the snapshot, or neither prop, behaves exactly as before
- Pages-editor Register/Schema selects now show a loading state while a refresh is in flight, and render an error notice with a Retry control when the fetch fails, so a failed load is no longer indistinguishable from "no schemas exist"
- `useAppInstaller` composable — one-click "Install and enable" for missing app dependencies via Nextcloud's own store endpoint (NC34+ `appstore` OCS API with strict password confirmation; legacy `/settings/apps/enable` fallback for ≤NC33)
- Admin-aware install/enable buttons on `CnDependencyMissing` and the `CnAppRoot` or-missing guard; non-admins get "ask your administrator" copy instead of a dead-end settings link
- HARD vs SOFT dependency model: manifest `dependencies` entries may now be objects `{ id, required, name }` — `required: false` marks an optional dependency that no longer blocks the app shell and instead shows a dismissible in-shell notice (dismissal persisted per app+dependency); plain string entries stay hard/blocking (fully backward-compatible, schemas v1 1.8.0 / v2 2.18.0)

### Changed
- **Fleet rename of 2026-08-21 applied to this library.** The Conduction apps this library names in its components, copy, and docs were renamed (OpenConnector→Integriq, DocuDesk→Filinq, Procest→Dossiq, Doriath→Keepiq, Decidesk→Decidiq, OpenBuild→Buildiq, LarpingApp→Larpinq, Scholiq→Learniq, SoftwareCatalog→Stackiq, Planix→Planninq; OpenRegister, OpenCatalogi, Pipelinq, Hermiq, Launchpad are unchanged). **No consumer code has to change.** Concretely:
  - Two public exports were renamed to their canonical new names, with the old names kept as **deprecated aliases** of the same implementation:
    - `CnOpenBuildEditButton` → **`CnBuildiqEditButton`** (component; file moved to `src/components/CnBuildiqEditButton/`)
    - `useOpenBuildEditAvailability` → **`useBuildiqEditAvailability`** (composable; file moved to `src/composables/useBuildiqEditAvailability.js`)

    Both old names are still exported from the package root (`src/index.js`) and from the `components` / `composables` barrels, so existing imports keep working unchanged. They are marked `@deprecated`; migrate at your convenience. No runtime deprecation warning is emitted — the library has no such mechanism and this rename does not warrant inventing one.
  - **Deliberately NOT renamed**, because they are data or runtime contracts that shipped manifests and consuming apps already carry: the `openbuildEditable` manifest key, the `cnOpenBuildAvailable` provide/inject key, the `openConnectorSourcesUrl` / `openconnectorUrl` component props, every lowercase app id and `/apps/<id>/` URL (`openbuild`, `openconnector`, `nldesign`, `decidesk`, …), and the `ScholiqDashboards` component name the `promoteCustomDashboard` codemod matches on.
  - The `CnBuildiqEditButton` BEM block was renamed `cn-openbuild-edit*` → `cn-buildiq-edit*` (markup, its scoped styles, and the unscoped globals in `src/css/patches.css`). An app that overrode the old class names in its own CSS must update those selectors.
  - User-facing strings and their `l10n/en.json` / `l10n/nl.json` entries were updated (e.g. "OpenConnector is not installed." → "Integriq is not installed.", "Edit with OpenBuild" → "Edit with Buildiq"). Msgids changed with the copy, so translation memories will need a re-run.
  - Docs pages `cn-open-build-edit-button.md` and `use-open-build-edit-availability.md` were renamed to `cn-buildiq-edit-button.md` / `use-buildiq-edit-availability.md`; all cross-links follow.
- **`2.2.0-vue3.9` — manifest action `params` on `handler: "navigate"` now resolve `{field}` row tokens** (`src/components/CnIndexPage/manifestActionDispatch.js`). Previously a declared `params: { id: "{id}" }` was pushed **verbatim**, producing URLs like `/synchronizations/%7Bid%7D`; it now resolves against the row (`"{id}"` → `row.id` with its type preserved, `"item-{id}"` interpolates, a brace-less `"new"` stays literal), and a token naming a field the row does not carry is dropped with a `console.warn` so `id` falls back to the row id. This is a **behaviour change to a declarative contract that shipped inside a `-vue3.N` prerelease with no release note** — recorded here retroactively (nextcloud-vue#623). It is a fix, not a break: the previous output was a broken URL in every case, so nothing could have depended on it. Manifests that declare no `params` are unaffected, and the ordinary "open this row's detail page" action should **omit** `params` entirely — the row id is already injected

### Fixed
- `useObjectStore` fetch-by-id (`_requestObject`) wrote `console.error` on **every** non-ok response, including an expected **404**. A "not found" is the designed answer for whole classes of page — a credential- or reference-verification page exists precisely to ask whether an id is real — and the outcome is already recorded in `errors[type]` for the component to render, so the console line was a second, uncontrollable channel that failed consumers' "no fatal JS errors" e2e assertions with no way to suppress it from the app. Now guarded on `status !== 404`; genuine faults still log and name the status/statusText, with the payload unwrapped via `toRaw` (it previously printed as an unreadable `Proxy(Object)`). The `catch` branch is deliberately untouched — `fetch` does not throw on an HTTP status, so anything reaching it is a real network or parse fault. Completes nextcloud-vue#612, which fixed only the sub-resource paths (`createSubResourcePlugin`, `useSubResource`) and missed the single-object path that emits the message consumers actually see
- Pages editor showed a **stale** Register/Schema list: `provide()` runs once, so the `dataSources` snapshot captured at app boot could never reflect anything created afterwards, and the dropdown stayed wrong until a full page reload. Adopt `dataSourcesLoader` to fix (see Added)
- Removed a `node_modules` symlink accidentally committed to `beta`, pointing at an absolute path on one machine — it broke fresh clones and CI checkouts. It slipped past `.gitignore` because the pattern was `node_modules/`, and a trailing slash matches only directories while a symlink is a file to git
- `CnFormPage` — added the missing `@event step` and `@slot actions` / `@slot submit` JSDoc (styleguide docs were incomplete)
- `CnAppRoot` or-missing guard rendered raw `app-availability.*` i18n keys — English defaults now render when no translation is provided
- Unified the two overlapping user-picker widget paths on `user-select`; native Nextcloud user picker now renders for single-user fields
- `CnEditDataModal` register/schema cache can now be reset (`invalidateDataCache` exported)

## [1.0.0]

This is a major release. The library grew from 57 to 148 exported symbols and introduced a full manifest-driven app shell, a pluggable integration registry, and a comprehensive security layer. Apps on `0.1.0-beta.x` can upgrade without changing template code — all new props carry defaults and no existing props were removed.

See **[Migrating from 0.1.x](docs/migrating-from-0.1.md)** for the step-by-step upgrade checklist.

---

### Required changes for all apps

| # | What | Where |
|---|------|-------|
| 1 | Call `registerTranslations()` once before `new Vue().$mount()` | `main.js` |
| 2 | Bump `@conduction/nextcloud-vue` to `^1.0.0-beta` | `package.json` |

No component template changes are required. Existing props, events, and slots are all preserved.

---

### New: Manifest-driven app shell

Apps can now declare their entire shell — routes, navigation, pages, dependencies — in a single `src/manifest.json`. The library renders it without any boilerplate Vue Router setup.

| Symbol | Description |
|--------|-------------|
| `CnAppRoot` | Top-level app wrapper. Handles loading → dependency-check → shell phases. |
| `CnPageRenderer` | Type dispatcher mounted inside `<router-view>`. Matches routes by `page.id`. |
| `CnAppNav` | Manifest-driven `NcAppNavigation`. Sorts by `order`, filters by `permission`. |
| `CnAppLoading` | Default loading screen used by `CnAppRoot`. |
| `CnDependencyMissing` | Dependency-missing screen. Lists missing apps with install/enable links. |
| `useAppManifest` | Composable: load + validate the app manifest. Returns `{ manifest, isLoading, validationErrors }`. |
| `useAppStatus` | Composable: check whether a Nextcloud app is installed/enabled. Cached per `appId`. |
| `validateManifest` / `validateManifestV2` | Validate a manifest against the JSON Schema. |
| `resolveManifestSentinels` / `resolveRouteSentinels` | Bind `@route.*` sentinels into config at render time. |
| `dispatchAction` | Invoke a manifest-declared `handler` or `navigate` action. |

Manifest page types: `index`, `detail`, `dashboard`, `custom`. See [JSON Manifest Renderer](docs/getting-started.md) for adoption tiers.

---

### New: Pluggable integration registry

Apps register sidebar tabs and dashboard widgets that surface across `CnObjectSidebar`, `CnDashboardPage`, and `CnDetailPage` without coupling to the host app.

| Symbol | Description |
|--------|-------------|
| `integrations` | Shared registry singleton |
| `createIntegrationRegistry` | Factory for a new registry instance |
| `installIntegrationRegistry` | Install the singleton on `window.OCA.OpenRegister.integrations` |
| `registerIntegration` | Load-order-safe leaf-side helper |
| `useIntegrationRegistry` | Vue 2.7 composable: reactive view onto the registry |
| `builtinIntegrations` / `registerBuiltinIntegrations` | Library-provided built-in integrations (files, notes, tags, tasks, audit trail, talk) |

---

### New components

**Layout & Shell**

| Component | Description |
|-----------|-------------|
| `CnIndexSidebar` | Index page sidebar with schema description and filter summary |
| `CnDetailGrid` | Data-driven label-value grid (grid and horizontal layout modes) |
| `CnPageHeader` | Page header with icon, title, description |
| `CnActionsBar` | Action bar: add button, mass actions, view toggle, search |
| `CnActionsMenu` | Shared overflow action menu (Refresh, Documentation, Request Feature) |

**Dialogs**

| Component | Description |
|-----------|-------------|
| `CnCopyDialog` | Single-item copy with naming pattern selector |
| `CnAdvancedFormDialog` | Richer create/edit dialog with Properties table, Data (JSON) tab, CodeMirror, optional Metadata tab |
| `CnSchemaFormDialog` | Full JSON Schema editor: Properties, Configuration, Security tabs |
| `CnTabbedFormDialog` | Multi-tab form dialog |
| `CnMassActionBar` | Floating bar for mass action triggers |
| `CnMassCopyDialog` | Bulk copy with naming patterns |
| `CnMassExportDialog` | Bulk export with format selection |
| `CnMassImportDialog` | Bulk import with file upload |

**Data Display**

| Component | Description |
|-----------|-------------|
| `CnCardGrid` | Grid of object cards |
| `CnObjectCard` | Single object card |
| `CnFacetSidebar` | Faceted filter sidebar |
| `CnJsonViewer` | Syntax-highlighted code viewer/editor (CodeMirror; JSON, XML, HTML, plain text) |
| `CnCellRenderer` | Cell value formatter for tables |
| `CnStatusBadge` | Color-coded status/priority pill badge |
| `CnRowActions` | Row action buttons: inline + overflow dropdown |
| `CnContextMenu` | Right-click context menu (pair with `useContextMenu`) |
| `CnIcon` | MDI icon by name |
| `CnFilterBar` | Search + filter controls row |
| `CnQuickFilterBar` | Clickable filter-tab bar |

**Dashboard & Widgets**

| Component | Description |
|-----------|-------------|
| `CnDashboardGrid` | Low-level GridStack grid layout engine (drag/drop, resize) |
| `CnWidgetWrapper` | Widget container shell with header, content area, footer |
| `CnWidgetRenderer` | Renders Nextcloud Dashboard API widgets (v1/v2) with auto-refresh |
| `CnWidgetGrid` | V2 manifest slot dispatcher |
| `CnTileWidget` | Quick-access tile with icon and link |
| `CnChartWidget` | Chart widget with optional GraphQL dataSource |
| `CnStatsBlockWidget` | Stats block for dashboard use |
| `CnKpiGrid` | KPI metric cards grid |
| `CnStatsPanel` | Sections of stat blocks, list items, and progress bars |
| `CnProgressBar` | Labeled horizontal progress bar with variant colors |

**Object Widgets**

| Component | Description |
|-----------|-------------|
| `CnObjectDataWidget` | Schema-driven editable data grid: click-to-edit, dirty tracking, saves via objectStore |
| `CnObjectMetadataWidget` | Read-only metadata display: extracts `@self` block from OpenRegister objects |

**Settings**

| Component | Description |
|-----------|-------------|
| `CnSettingsSection` | Settings section container with flex header (heading + actions) |
| `CnRegisterMapping` | Register mapping configuration |
| `CnVersionInfoCard` | Version info display card |

**Notifications & Support**

| Component | Description |
|-----------|-------------|
| `CnSupportDialog` | Support dialog with server-side persistence, auto-mounted by `CnAppRoot` |
| `CnNotificationPreferences` | User notification preferences pane, shown in settings slot |

**App-level Pages**

| Component | Description |
|-----------|-------------|
| `CnLogsPage` | Log viewer page |
| `CnFilesPage` | Files tab page |
| `CnSettingsPage` | Settings page shell |
| `CnChatPage` | Talk/chat embed page |
| `CnMapPage` | Map embed page |
| `CnFeaturesAndRoadmapView` | Feature request and roadmap overview |

**Integration leaves** (used via the registry, not directly):
`CnFilesCard`, `CnNotesCard`, `CnTagsCard`, `CnTasksCard`, `CnAuditTrailCard` — plus Talk, Deck, Calendar, Polls, Forms, Photos, Bookmarks, Collectives, Maps, Analytics, Cospend, XWiki, OpenProject, TimeTracker, Flow tabs and cards.

---

### New store plugins

| Plugin | Description |
|--------|-------------|
| `logsPlugin(options)` | Fetches and exposes logs for a parent object. `options.parentIdParam` is required. |
| `liveUpdatesPlugin` | Real-time collection updates via `@nextcloud/notify_push`. |
| `registerMappingPlugin` | Register mapping state and actions. |

All three are passed in the `plugins` array of `createObjectStore` or `createCrudStore`. Existing plugin calls are unchanged.

---

### New composables

| Composable | Description |
|------------|-------------|
| `useDetailView` | Load, edit, delete state management for detail pages |
| `useDashboardView` | Widget definitions, layout, NC widget loading, add/remove/persist |
| `useContextMenu` | Right-click context menu positioning and state |
| `useFileSelection` | File upload/drop handling |

---

### New utilities

| Export | Description |
|--------|-------------|
| `safeHref(url)` | Validates a URL for `:href` bindings. Rejects `javascript:`, `data:`, `vbscript:`, and protocol-relative `//` URLs — returns `'#'`. |
| `safeImageSrc(url)` | Validates a URL for `<img src>`. Allows `https:`, `http:`, and safe `data:image/...` URIs only. |
| `safeSvgPath(d)` | Validates an SVG `path[d]` attribute against an allowlist of SVG path characters. |
| `fieldsFromSchema(schema, options)` | Generate form field definitions from JSON Schema |
| `filtersFromSchema(schema, options)` | Generate filter definitions from JSON Schema |

---

### Changes to existing components

**`CnIndexPage`** — large expansion, all backwards compatible
- New props (all have defaults): `register`, `schema` (now also accepts `string` for self-fetch mode), `filter`, `quickFilters`, `sidebar`, `searchValue`, `visibleColumns`, `activeFilters`, `cardComponent`, `headerActions`, `documentationUrl`, `showRequestFeature`, `showViewAction`
- Self-fetch mode: when `register` + `schema` are passed without `store`/`objects`, the page fetches its own data and the form dialog saves directly — no `@create`/`@edit` handler needed in the parent
- Mass action dialogs now built-in (Delete, Copy, Export, Import)

**`CnFormDialog`** — all backwards compatible
- `cancelLabel` and `closeLabel` now use `t('nextcloud-vue', ...)` for translation by default
- New prop: `referenceContext` (for integration widgets in schema reference properties)
- Conditional field visibility: fields with `visibleWhen` conditions now hide/show reactively and clear their values when hidden

**`CnDashboardPage`** — all backwards compatible
- New props (all have defaults): `surface`, `integrationContext`, `dateRange`, `showRefresh`, `showRequestFeature`, `documentationUrl`, `pageId`, `content`

**`CnDataTable`** — all backwards compatible
- `columns` prop now accepts bare string keys (`['title', 'status']`) in addition to full column objects. String keys are enriched from `schema` when one is provided.

**`CnSettingsSection`** — visual change only
- Heading and actions are now in a flex row. No prop changes.

---

### Security

- All components that bind user-controlled URLs to `:href` or `src` now call `safeHref`/`safeImageSrc` internally
- `cnRenderMarkdown` uses DOMPurify with a protocol-allowlist that blocks `javascript:`, `data:`, and protocol-relative URLs
- GraphQL composable validates query strings before dispatch
- URL path segments are validated with `encodeURIComponent` before use in API calls
