---
sidebar_position: 4
---

# useDashboardView

Composable that backs [`CnDashboardPage`](../../components/cn-dashboard-page.md). Manages the merged widget catalog (app-defined + Nextcloud Dashboard API), the layout (load/save/default), role-based visibility filtering, and edit-mode state.

## Signature

```js
import { useDashboardView } from '@conduction/nextcloud-vue'

const {
  widgets, layout, loading, saving, isEditing,
  activeWidgetIds, availableWidgets, ncWidgets,
  onLayoutChange, addWidget, removeWidget, setWidgets, init,
} = useDashboardView({
  widgets: APP_WIDGETS,
  defaultLayout: DEFAULT_LAYOUT,
  loadLayout: () => fetch('/api/dashboard-layout').then(r => r.json()),
  saveLayout: (layout) => fetch('/api/dashboard-layout', { method: 'PUT', body: JSON.stringify(layout) }),
  includeNcWidgets: true,
  columns: 12,
})
```

### Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `widgets` | `Array` | `[]` | Static widget definitions. Each entry: `{ id, title, type, iconUrl?, iconClass?, visibility?, … }`. |
| `defaultLayout` | `Array` | `[]` | Fallback layout used when `loadLayout` returns `null` or an empty array. Each entry: `{ id, widgetId, gridX, gridY, gridWidth, gridHeight, showTitle? }`. |
| `loadLayout` | `() => Promise<Array\|null>` | `null` | Async loader for a persisted layout. |
| `saveLayout` | `(layout) => Promise<void>` | `null` | Async persister; called automatically from `onLayoutChange`. |
| `includeNcWidgets` | `boolean` | `false` | When true, `init()` also fetches widgets from `ocs/apps/dashboard/api/v1/widgets` and merges them into the catalog. |
| `columns` | `number` | `12` | Grid column count (for reference; the actual grid renderer reads this). |

### Visibility filtering

Each widget may declare a `visibility` block:

```js
{ id: 'admin-panel', type: 'custom', title: 'Admin',
  visibility: { users: ['admin'], groups: ['Admins'] } }
```

`init()` (and `setWidgets()`) run both widget arrays through [`filterWidgetsByVisibility`](../filter-widgets-by-visibility.md). Widgets without a `visibility` block (or with empty arrays) are visible to everyone. Layout items that reference a filtered-out widget are removed from `layout.value`.

### Return value

Reactive state:
- `widgets` — `computed`: concatenation of visible app widgets + visible NC widgets.
- `layout` — `Ref<Array>`: current grid placements.
- `loading` — true while `init()` runs.
- `saving` — true while `saveLayout` is in flight.
- `isEditing` — edit-mode flag (toggled by the consumer, e.g. from `CnDashboardPage`'s edit button).

Derived:
- `activeWidgetIds` — IDs currently placed on the dashboard.
- `availableWidgets` — `widgets` minus any whose ID is in `activeWidgetIds` (i.e. the "add widget" picker list).
- `ncWidgets` — Raw NC Dashboard API widget list (pre-visibility), normalized to the same shape as app widgets (`iconClass`, `iconUrl`, `widgetUrl`, `itemApiVersions`, `itemIconsRound`, `reloadInterval`, `buttons`, `type: 'nc-widget'`).

Methods:
- `onLayoutChange(newLayout)` — Sets `layout` and calls `saveLayout` if provided. Use as the `@layout-change` handler on `CnDashboardPage`.
- `addWidget(widgetId, position?)` — Appends a new layout item. `id` = highest existing numeric `id + 1`; `gridY` = bottom of the current layout; `gridWidth`/`gridHeight` default to 6/3 unless overridden in `position`.
- `removeWidget(itemId)` — Filters out the layout item with the matching numeric `id`.
- `setWidgets(newWidgets)` — Replaces `appWidgets` and re-runs visibility filtering (use when widget defs are data-driven).
- `init()` — Re-runs the full initialization. Called automatically on mount.

### Lifecycle

`onMounted` calls `init()`, which:
1. Kicks off `loadNcWidgets()` if `includeNcWidgets`.
2. Kicks off `loadLayout()` if provided, else uses `defaultLayout`.
3. Awaits all tasks, then applies visibility filtering.
4. On any thrown error, falls back to `defaultLayout` and logs to console.

## Related

- [CnDashboardPage](../../components/cn-dashboard-page.md) — Primary consumer.
- [filterWidgetsByVisibility](../filter-widgets-by-visibility.md) — The visibility helper used here.
