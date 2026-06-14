# Design: dashboard-widget-system

## Architecture Overview

The dashboard widget system adds a new page type to `@conduction/nextcloud-vue` alongside the existing `CnIndexPage` list pattern. It consists of five components and one composable that work together to provide configurable grid-based dashboards.

```
CnDashboardPage (orchestrator)
  ├── Header (title, description, edit toggle)
  ├── CnDashboardGrid (GridStack layout engine)
  │     └── for each layout item:
  │           CnWidgetWrapper (container shell)
  │             └── content determined by widget type:
  │                   ├── #widget-{id} scoped slot (custom)
  │                   ├── CnWidgetRenderer (NC Dashboard API)
  │                   └── CnTileWidget (quick-access tile)
  └── Empty state (when no widgets)

useDashboardView (composable)
  ├── Manages widget definitions + layout state
  ├── Loads NC Dashboard API widgets (optional)
  └── Provides add/remove/persist operations
```

## Component API Design

### CnDashboardPage

Top-level orchestrator. Assembles header, grid, and widget rendering with automatic widget type detection.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `'Dashboard'` | Page title |
| `description` | String | `''` | Page description |
| `widgets` | Array | `[]` | Widget definitions: `{ id, title, type, iconUrl?, iconClass?, itemApiVersions? }` |
| `layout` | Array | `[]` | Grid placements: `{ id, widgetId, gridX, gridY, gridWidth, gridHeight, showTitle? }` |
| `loading` | Boolean | `false` | Loading state |
| `allowEdit` | Boolean | `true` | Whether edit mode toggle is shown |
| `columns` | Number | `12` | Grid columns |
| `cellHeight` | Number | `80` | Grid cell height in px |
| `gridMargin` | Number | `12` | Grid margin in px |
| `editLabel` | String | `'Customize'` | Edit button label |
| `doneLabel` | String | `'Done'` | Done button label |
| `emptyLabel` | String | `'No widgets configured'` | Empty state text |
| `unavailableLabel` | String | `'Widget unavailable'` | Fallback text |

**Events:** `@layout-change(layout)`, `@edit-toggle(isEditing)`

**Slots:**
- `#header-actions` — Extra buttons in the header
- `#widget-{widgetId}="{ item, widget }"` — Custom widget content
- `#empty` — Custom empty state

**Widget type resolution order:**
1. If `#widget-{id}` scoped slot exists → custom widget
2. If widget has `itemApiVersions` → NC Dashboard API widget (CnWidgetRenderer)
3. If widget has `type: 'tile'` → tile widget (CnTileWidget)
4. Otherwise → "unknown widget" fallback

### CnDashboardGrid

Core grid layout engine wrapping GridStack.js. Handles initialization, drag/resize events, and layout synchronization.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `layout` | Array | `[]` | Array of grid items with position/size |
| `editable` | Boolean | `false` | Enable drag/resize |
| `columns` | Number | `12` | Number of columns |
| `cellHeight` | Number | `80` | Cell height in px |
| `margin` | Number | `12` | Gap between items |
| `minWidth` | Number | `2` | Minimum item width |
| `minHeight` | Number | `2` | Minimum item height |

**Events:** `@layout-change(updatedLayout)`

**Slots:** `#widget="{ item }"` — Render content for each grid item

### CnWidgetWrapper

Widget container shell with optional header (icon + title), scrollable content area, and footer.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Widget title |
| `showTitle` | Boolean | `true` | Show/hide header |
| `iconUrl` | String | `null` | Icon image URL |
| `iconClass` | String | `null` | Icon CSS class |
| `buttons` | Array | `[]` | Header action buttons |
| `styleConfig` | Object | `{}` | Optional style overrides |

**Slots:** default (content), `#header-actions`, `#footer`

### CnWidgetRenderer

Self-contained NC Dashboard API widget renderer. Fetches items from OCS endpoint and transforms them to NcDashboardWidget format with auto-refresh.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `widget` | Object | required | NC widget object with `id`, `title`, `itemApiVersions`, `itemsUrl` |
| `unavailableText` | String | `'Widget unavailable'` | Fallback text when loading fails |

### CnTileWidget

Quick-access tile with icon and link.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tile` | Object | required | `{ title, icon, iconType, backgroundColor, textColor, linkType, linkValue }` |

`iconType` options: `'svg'`, `'class'`, `'url'`, `'emoji'`
`linkType` options: `'app'` (Nextcloud route), `'url'` (external)

### useDashboardView composable

```js
const { widgets, layout, loading, saving, isEditing,
        activeWidgetIds, availableWidgets,
        onLayoutChange, addWidget, removeWidget,
        setWidgets, init } = useDashboardView({
  widgets: WIDGET_DEFS,
  defaultLayout: DEFAULT_LAYOUT,
  loadLayout: async () => { /* fetch from app config */ },
  saveLayout: async (layout) => { /* persist to app config */ },
  includeNcWidgets: false,
  columns: 12,
})
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `widgets` | Array | `[]` | Static widget definitions |
| `defaultLayout` | Array | `[]` | Default layout when none is persisted |
| `loadLayout` | Function\|null | `null` | Async function to load persisted layout |
| `saveLayout` | Function\|null | `null` | Async function to persist layout |
| `includeNcWidgets` | Boolean | `false` | Load NC Dashboard API widgets from OCS |
| `columns` | Number | `12` | Grid column count |

**Returns:**

| Key | Type | Description |
|-----|------|-------------|
| `widgets` | Ref\<Array\> | All widget definitions (static + NC API) |
| `layout` | Ref\<Array\> | Current layout |
| `loading` | Ref\<Boolean\> | Loading state |
| `saving` | Ref\<Boolean\> | Saving state |
| `isEditing` | Ref\<Boolean\> | Edit mode toggle |
| `activeWidgetIds` | ComputedRef\<Set\> | IDs of widgets currently in layout |
| `availableWidgets` | ComputedRef\<Array\> | Widgets not yet in layout |
| `onLayoutChange(layout)` | Function | Handle layout change + auto-save |
| `addWidget(widgetId)` | Function | Add widget to layout |
| `removeWidget(widgetId)` | Function | Remove widget from layout |
| `setWidgets(widgets)` | Function | Replace widget definitions |
| `init()` | Function | Initialize (load layout, load NC widgets) |

---

## Implementation Details

### GridStack Integration

GridStack.js (v10.3.1) is loaded as a direct dependency. The grid is initialized in `mounted()` with:

```js
import { GridStack } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'

this.grid = GridStack.init({
  column: this.columns,
  cellHeight: this.cellHeight,
  margin: this.margin,
  disableDrag: !this.editable,
  disableResize: !this.editable,
  float: true,
})
```

Layout items are synced via `grid.load()` when the `layout` prop changes. Drag/resize events emit `@layout-change` with the updated positions.

### NC Dashboard API Widget Loading

When `includeNcWidgets: true`, the composable fetches from:
```
/ocs/v2.php/apps/dashboard/api/v1/widgets
```

Each NC widget is transformed into the standard widget definition format and merged with static widget definitions.

### Widget Type Detection in CnDashboardPage

```js
getWidgetType(widgetId) {
  if (this.$scopedSlots['widget-' + widgetId]) return 'custom'
  const widget = this.widgetMap[widgetId]
  if (widget?.itemApiVersions) return 'nc-api'
  if (widget?.type === 'tile') return 'tile'
  return 'unknown'
}
```

---

## File Structure

```
src/components/
  CnDashboardPage/
    CnDashboardPage.vue
    index.js
  CnDashboardGrid/
    CnDashboardGrid.vue
    index.js
  CnWidgetWrapper/
    CnWidgetWrapper.vue
    index.js
  CnWidgetRenderer/
    CnWidgetRenderer.vue
    index.js
  CnTileWidget/
    CnTileWidget.vue
    index.js
src/composables/
  useDashboardView.js
src/css/
  dashboard.css
```

All 5 components + composable are added to barrel exports. CSS is imported via `index.css`.

---

## Decisions

### 1. Scoped slots over component registry

**Chosen**: `#widget-{widgetId}` scoped slots for custom widget rendering.

**Alternative**: Global widget registry where apps register widget components by ID.

**Rationale**: Scoped slots keep widgets local to the consuming app. No global state, no cross-app coupling, trivially testable. The parent controls exactly what renders in each widget.

### 2. GridStack.js as grid engine

**Chosen**: GridStack.js v10.3.1.

**Alternative**: CSS Grid with custom drag/drop via interact.js or vue-draggable.

**Rationale**: GridStack provides drag, drop, resize, collision detection, and auto-placement in a single dependency. Building equivalent functionality with CSS Grid + drag library would be 500+ LOC of complex interaction code.

### 3. Layout persistence via callbacks

**Chosen**: `loadLayout`/`saveLayout` async callbacks in `useDashboardView`.

**Alternative**: Store layout in OpenRegister as an object.

**Rationale**: Layout is app-specific configuration, not domain data. Apps should store it where they store other settings (app config, user preferences). The composable is agnostic to the storage mechanism.

### 4. No style configuration

**Chosen**: Apps control widget styling via their own CSS/classes.

**Alternative**: Include a style configuration UI (color pickers, background selectors).

**Rationale**: Style configuration is MyDash's value-add. The shared library provides the structural grid; MyDash will layer style controls on top later.

---

## Trade-offs

| Risk | Mitigation |
|------|-----------|
| GridStack.js adds ~40KB to bundle | Only loaded on dashboard pages; tree-shakeable if page is not used |
| GridStack CSS may conflict with NC styles | All custom classes use `cn-` prefix; GridStack's own classes are scoped |
| NC Dashboard API may change between NC versions | CnWidgetRenderer handles v1 and v2 API; graceful fallback on error |
| Apps using old hardcoded dashboards need migration | Migration is opt-in per app; old dashboards continue to work |

---

## Migration Plan

1. Release components in `nextcloud-vue` (this change)
2. Migrate procest Dashboard.vue as proof of concept (done)
3. Migrate pipelinq dashboard (separate task)
4. Migrate opencatalogi dashboard (separate task)
5. Refactor MyDash to consume these components (separate change)
