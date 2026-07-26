# Changelog

## [Unreleased]

### Added
- **Leaf mount-render escape hatch** (openregister#2127, ADR-066) — an integration leaf may now render via a micro-frontend `mount(el, props)` / `unmount(el)` hand-off instead of an SFC, so a leaf built against a **different Vue major** than the host (a Vue-3 leaf under the Vue-2.7 OpenBuild/OpenRegister host) renders inside a bare host-owned element with its own framework instance rather than crashing under the host renderer. The registry descriptor gains an optional `renderMode` (`'component'` default | `'mount'`) plus the `mount`/`unmount` pair; the pair is validated together (supplying one half throws in dev / warns-and-drops in prod) and a `mount`-mode descriptor no longer requires `tab`/`widget`. New `CnLeafMountHost` component owns the mount lifecycle (lazy mount on show, unmount on hide/teardown, deterministic re-mount on bound-object change, per-container error isolation). `CnObjectSidebar`, `CnDetailPage`, and `CnDashboardPage` render a `mount`-mode leaf through `CnLeafMountHost`; the SFC/built-in (`renderMode: 'component'`) path is unchanged
- Optional top-level `mcp` block in the v2 app manifest schema (`src/schemas/app-manifest-v2.schema.json`) — advisory MCP tool visibility/UX hints (`expose`, `pageTools`, `agentHints`) per ADR-063. Purely presentational: OpenRegister's register + RBAC remain the sole source of CRUD-tool truth and invoke-time authority; nothing in `nextcloud-vue` reads `manifest.mcp`. Fully optional and additive — existing manifests validate unchanged
- `CnAppRoot` `dataSourcesLoader` prop — an async `() => ({ registers })` re-invoked every time a pages-editor modal opens, so a register or schema created after app boot appears without a page reload. Feeds a stable reactive `cnDataSourcesState` holder (provided **by reference** and mutated in place, so the one-shot `provide()` still observes updates) plus a provided `cnRefreshDataSources()` action that de-dupes concurrent refreshes and keeps the last good list on failure. The existing `dataSources` prop and `cnDataSources` provide key are unchanged — a consumer passing only the snapshot, or neither prop, behaves exactly as before
- Pages-editor Register/Schema selects now show a loading state while a refresh is in flight, and render an error notice with a Retry control when the fetch fails, so a failed load is no longer indistinguishable from "no schemas exist"
- `useAppInstaller` composable — one-click "Install and enable" for missing app dependencies via Nextcloud's own store endpoint (NC34+ `appstore` OCS API with strict password confirmation; legacy `/settings/apps/enable` fallback for ≤NC33)
- Admin-aware install/enable buttons on `CnDependencyMissing` and the `CnAppRoot` or-missing guard; non-admins get "ask your administrator" copy instead of a dead-end settings link
- HARD vs SOFT dependency model: manifest `dependencies` entries may now be objects `{ id, required, name }` — `required: false` marks an optional dependency that no longer blocks the app shell and instead shows a dismissible in-shell notice (dismissal persisted per app+dependency); plain string entries stay hard/blocking (fully backward-compatible, schemas v1 1.8.0 / v2 2.18.0)

### Fixed
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
