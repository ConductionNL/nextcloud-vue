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
- `CnPageHeader` — Page header with icon, title, description
- `CnActionsBar` — Action bar with add button, mass actions, view toggle, search

**Data Display**
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
- `CnFormDialog` — Schema-driven create/edit form dialog (auto-generates fields, supports slot overrides)
- `CnAdvancedFormDialog` — Richer create/edit dialog with properties table (click-to-edit), Data (JSON) tab with CodeMirror, optional Metadata tab; optional useObjectStore integration; fixed large size

**Mass-Action Dialogs** (emit-based, two-phase confirm → result)
- `CnMassDeleteDialog` — Bulk delete confirmation
- `CnMassCopyDialog` — Bulk copy with naming patterns
- `CnMassExportDialog` — Bulk export with format selection
- `CnMassImportDialog` — Bulk import with file upload

**UI Elements**
- `CnStatusBadge` — Color-coded status/priority pill badge
- `CnRowActions` — Row action buttons (inline + overflow dropdown)
- `CnMassActionBar` — Floating bar for mass action triggers
- `CnIcon` — MDI icon by name
- `CnKpiGrid` — KPI metric cards grid
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
- `createObjectStore(id, options)` — Factory to create an app's object store with plugins. **Always use this** — do NOT use `useObjectStore` directly from the library (webpack module duplication causes store mismatches).
- `useObjectStore` — Internal default store. Only use the instance returned by YOUR app's `createObjectStore()`.

**Store setup pattern** (every app should follow this):
```js
// src/store/modules/object.js
import { createObjectStore, filesPlugin, auditTrailsPlugin, relationsPlugin } from '@conduction/nextcloud-vue'
export const useObjectStore = createObjectStore('object', {
  plugins: [filesPlugin(), auditTrailsPlugin(), relationsPlugin()],
})
```

**IMPORTANT — Vue 2 store access rules:**
- Access the store via `computed` properties (Options API), NOT in `setup()` — Vue 2 Pinia injection doesn't work reliably in Composition API `setup()`
- The `useListView` and `useDetailView` composables have a webpack module duplication issue: they import their own `useObjectStore` internally, which creates a separate store instance from your app's store. **Do NOT rely on them for schema loading or store operations.** Use Options API with direct store access instead.

### Available Composables
- `useListView(options)` — Search debounce, filter state, sort, pagination. **Note:** Due to webpack alias module duplication, pass `store` option explicitly or use Options API pattern instead (see list view pattern below).
- `useDetailView(options)` — Load, edit, delete state management
- `useFileSelection(options)` — File upload/drop handling
- `useDashboardView(options)` — Dashboard state: widget defs, layout, NC widget loading, add/remove/persist

### List View Pattern (recommended)

Use Options API with direct store access for reliable schema loading and collection management:

```js
import { CnIndexPage, CnAdvancedFormDialog } from '@conduction/nextcloud-vue'
import { useObjectStore } from '../../store/modules/object.js'

export default {
  components: { CnIndexPage, CnAdvancedFormDialog },
  data() {
    return { showCreateDialog: false, sortKey: null, sortOrder: 'asc', mySchema: null }
  },
  computed: {
    objectStore() { return useObjectStore() },
    objects() { return this.objectStore.collections?.mytype || [] },
    loading() { return this.objectStore.loading?.mytype || false },
    pagination() { return this.objectStore.pagination?.mytype || { total: 0, page: 1, pages: 1, limit: 20 } },
  },
  async mounted() {
    this.mySchema = await this.objectStore.fetchSchema('mytype')
    await this.fetchCollection()
  },
  methods: {
    async fetchCollection(page = 1) {
      await this.objectStore.fetchCollection('mytype', { _page: page, _limit: 20,
        _order: this.sortKey ? { [this.sortKey]: this.sortOrder } : undefined })
    },
    onSort({ key, order }) { this.sortKey = key; this.sortOrder = order; this.fetchCollection() },
    onPageChange(page) { this.fetchCollection(page) },
    async onCreateConfirm(formData) {
      const result = await this.objectStore.saveObject('mytype', formData)
      if (result) { this.showCreateDialog = false; this.fetchCollection() }
    },
  },
}
```

### CnIndexPage Dialog Override System

CnIndexPage has built-in single-object dialogs (Delete, Copy, Form) that are **overridable at three levels**:

1. **Full dialog replacement** via named slots:
   - `#delete-dialog="{ item, close }"` — Replace delete dialog
   - `#copy-dialog="{ item, close }"` — Replace copy dialog
   - `#form-dialog="{ item, schema, close }"` — Replace create/edit dialog (use CnFormDialog or CnAdvancedFormDialog)
2. **Form content override** — `#form-fields` replaces the form inside the built-in CnFormDialog
3. **Per-field override** — `#field-{key}` inside CnFormDialog replaces a single field

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
