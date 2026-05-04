# CnDashboardPage

Top-level dashboard page component — the dashboard equivalent of `CnIndexPage`. Assembles a complete dashboard from a `widgets` definition array and a `layout` array. Supports custom widgets via scoped slots, Nextcloud Dashboard API widgets, tile widgets, and an optional drag-and-drop edit mode.

**Wraps**: CnDashboardGrid, CnWidgetWrapper, CnWidgetRenderer, CnTileWidget

## Widget types

| Type | How to use |
|------|-----------|
| **Custom** | Provide a `#widget-{widgetId}` scoped slot |
| **NC Dashboard API** | Widget def has `itemApiVersions` — auto-rendered via `CnWidgetRenderer` |
| **Tile** | Widget def has `type: 'tile'` — renders as a quick-access link tile |

## Usage

```vue
<template>
  <CnDashboardPage
    title="Dashboard"
    :widgets="WIDGETS"
    :layout="layout"
    :loading="loading"
    :allow-edit="true"
    @layout-change="saveLayout"
    @edit-toggle="onEditToggle">

    <!-- Custom widgets -->
    <template #widget-kpis="{ item }">
      <CnKpiGrid :items="kpiData" />
    </template>

    <template #widget-cases-chart="{ item }">
      <CnChartWidget type="pie" :series="chartSeries" :labels="chartLabels" />
    </template>

    <!-- Per-widget header actions -->
    <template #widget-kpis-actions="{ item }">
      <NcButton type="tertiary" @click="refreshKpis">Refresh</NcButton>
    </template>

    <template #header-actions>
      <NcButton @click="addWidget">Add widget</NcButton>
    </template>
  </CnDashboardPage>
</template>

<script>
const WIDGETS = [
  { id: 'kpis', title: 'Key Metrics', type: 'custom' },
  { id: 'cases-chart', title: 'Cases by status', type: 'custom', iconClass: 'icon-chart' },
]

const DEFAULT_LAYOUT = [
  { id: 1, widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, showTitle: false },
  { id: 2, widgetId: 'cases-chart', gridX: 0, gridY: 2, gridWidth: 6, gridHeight: 4 },
]
</script>
```

Use the `useDashboardView` composable to manage widget state and layout persistence:

```js
import { useDashboardView } from '@conduction/nextcloud-vue'

const { widgets, layout, loading, onLayoutChange } = useDashboardView({
  widgets: WIDGETS,
  defaultLayout: DEFAULT_LAYOUT,
  loadLayout: () => loadFromConfig('dashboard_layout'),
  saveLayout: (l) => saveToConfig('dashboard_layout', l),
})
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Page title |
| `description` | String | `''` | Description shown below the title |
| `widgets` | Array | `[]` | Widget definition objects (see Widget definition below) |
| `layout` | Array | `[]` | Grid placement objects (see Layout item below) |
| `loading` | Boolean | `false` | Show loading spinner instead of the grid |
| `allowEdit` | Boolean | `false` | Show the Edit/Done toggle button |
| `columns` | Number | `12` | Number of grid columns |
| `cellHeight` | Number | `80` | Grid cell height in pixels |
| `gridMargin` | Number | `12` | Gap between grid items in pixels |
| `editLabel` | String | `'Edit'` | Label for the edit button |
| `doneLabel` | String | `'Done'` | Label for the done button |
| `emptyLabel` | String | `'No widgets configured'` | Empty state message |
| `unavailableLabel` | String | `'Widget not available'` | Fallback for unknown widget IDs |

#### Widget definition

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique widget identifier |
| `title` | String | Widget title shown in the wrapper header |
| `type` | String | `'custom'` (default) or `'tile'` |
| `iconUrl` | String | Header icon image URL |
| `iconClass` | String | Header icon CSS class |
| `titleIconPosition` | String | Position of the `widget-{id}-title-icon` slot: `'left'` (before title) or `'right'` (after actions, default) |
| `titleIconColor` | String | CSS color applied to the title-icon slot container (e.g. `'#e74c3c'`) |
| `buttons` | Array | Footer buttons: `[{ text, link }]` |
| `itemApiVersions` | Number[] | NC Dashboard API versions — triggers auto-rendering |
| `reloadInterval` | Number | Auto-refresh interval in seconds (NC widgets) |

#### Layout item

| Field | Type | Description |
|-------|------|-------------|
| `id` | String \| Number | Unique placement ID |
| `widgetId` | String | References a widget `id` from the `widgets` array |
| `gridX` | Number | Column start (0-based) |
| `gridY` | Number | Row start (0-based) |
| `gridWidth` | Number | Width in grid columns |
| `gridHeight` | Number | Height in grid rows |
| `showTitle` | Boolean | Whether to show the wrapper header (default `true`) |
| `styleConfig` | Object | Style overrides passed to CnWidgetWrapper |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `layout-change` | `layout[]` | Emitted when the user drags or resizes a widget; payload is the full updated layout array |
| `edit-toggle` | `boolean` | Emitted when the Edit/Done button is clicked; payload is the new editing state |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `header-actions` | — | Extra buttons in the page header (right side) |
| `widget-{widgetId}` | `{ item, widget }` | Custom content for a specific widget |
| `widget-{widgetId}-actions` | `{ item, widget }` | Header action buttons for a specific widget |
| `widget-{widgetId}-title-icon` | `{ item, widget }` | Extra icon in the widget header; position and color controlled by `titleIconPosition` / `titleIconColor` on the widget definition |
| `empty` | — | Custom empty state when no layout items exist |
