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

### Available Components

**Layout & Pages**
- `CnIndexPage` — Top-level schema-driven index page (table/cards, pagination, mass actions, dialogs)
- `CnDetailPage` — Generic detail/overview page with stats table and flexible content slots (simpler alternative to CnIndexPage)
- `CnPageHeader` — Page header with icon, title, description
- `CnActionsBar` — Action bar with add button, mass actions, view toggle, search

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

### Available Store
- `useObjectStore` — Generic Pinia store for OpenRegister objects (CRUD, pagination, search, caching)
- `createObjectStore(id)` — Factory to create store with custom ID

### Available Composables
- `useListView(options)` — Search debounce, filter state, sort, pagination
- `useDetailView(options)` — Load, edit, delete state management
- `useFileSelection(options)` — File upload/drop handling
- `useDashboardView(options)` — Dashboard state: widget defs, layout, NC widget loading, add/remove/persist
- `useContextMenu()` — Right-click context menu positioning and state (cursor CSS vars, open/close, action helpers)

### CnIndexPage Dialog Override System

CnIndexPage has built-in single-object dialogs (Delete, Copy, Form) that are **overridable at three levels**:

1. **Full dialog replacement** via named slots:
   - `#delete-dialog="{ item, close }"` — Replace delete dialog
   - `#copy-dialog="{ item, close }"` — Replace copy dialog
   - `#form-dialog="{ item, schema, close }"` — Replace create/edit dialog (use CnFormDialog or CnAdvancedFormDialog)
2. **Form content override** — `#form-fields` replaces the form inside the built-in CnFormDialog
3. **Per-field override** — `#field-{key}` inside CnFormDialog replaces a single field
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

## Rules for Modifying Components

1. **NEVER break existing prop interfaces** — new props MUST have defaults
2. **NEVER remove props, events, or slots** — deprecate with console.warn instead
3. **Always maintain backwards compatibility** — existing consumers must not break
4. **Always ask the user before upgrading a component** — propose changes via discussion first
5. **Run `npm test` before submitting changes**
6. **CSS class prefix**: All classes use `cn-` prefix to avoid collisions
7. **Theming**: Use Nextcloud CSS variables only (`var(--color-primary-element)`, `var(--color-border)`, etc.). Do NOT reference `--nldesign-*` variables — the nldesign app overrides Nextcloud's own variables, so theming works automatically.
8. **Translation**: Components accept pre-translated strings via props with English defaults. Never import `t()` from a specific app.

## Adding New Components

1. Create directory: `src/components/CnMyComponent/`
2. Create Vue SFC with `name: 'CnMyComponent'`
3. Add JSDoc to every prop, event, slot, and method
4. Add `index.js` re-export
5. Add to `src/components/index.js` barrel
6. Add to `src/index.js` barrel
7. Write test in `tests/components/`
8. Use Nextcloud CSS variables only (no `--nldesign-*` references)

## Project Structure

```
src/
  index.js              # Main barrel export
  components/           # Vue SFC components (CnPrefixed)
  store/                # Pinia stores
  composables/          # Vue composables
  css/                  # Global CSS modules
  utils/                # Utility functions
```

## Consumer Apps

This library is used by: OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash.
Changes here affect all of them. Test carefully.
