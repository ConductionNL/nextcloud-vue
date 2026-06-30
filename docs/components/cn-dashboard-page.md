import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnDashboardPage.md'

# CnDashboardPage

Top-level dashboard page component — the dashboard equivalent of `CnIndexPage`. Assembles a complete dashboard from a `widgets` definition array and a `layout` array. Supports custom widgets via scoped slots, Nextcloud Dashboard API widgets, tile widgets, and an optional drag-and-drop edit mode.

**Wraps**: CnDashboardGrid, CnWidgetWrapper, CnWidgetRenderer, CnTileWidget

## Try it

<Playground component="CnDashboardPage" />

## Widget types

| Type | How to use |
|------|-----------|
| **Tile** | Widget def has `type: 'tile'` — renders as a quick-access link tile |
| **Custom** | Provide a `#widget-{widgetId}` scoped slot (escape hatch — beats every built-in branch when a slot exists) |
| **Chart** | Widget def has `type: 'chart'` — declarative apexcharts mount via `CnChartWidget`; chart inputs ride `widgetDef.props` |
| **NC Dashboard API** | Widget def has `itemApiVersions` — auto-rendered via `CnWidgetRenderer` |

The dispatcher resolves widgets in that order. The custom-slot branch beats the chart branch so apps that need bespoke apexcharts behaviour outside the manifest contract can fall back to `#widget-{id}` without losing the rest of the manifest.

### Chart widget

```js
const WIDGETS = [{
  id: 'sla-trend',
  title: 'SLA trend',
  type: 'chart',
  props: {
    chartKind: 'line',                   // line | bar | donut | area | pie | radialBar
    series: [{ name: 'SLA %', data: [82, 88, 91, 93] }],
    categories: ['Q1', 'Q2', 'Q3', 'Q4'],
    options: { stroke: { width: 3 } },   // deep-merged with CnChartWidget defaults
    height: 280,
    // Reserved for a future cycle — not read at render time today:
    // dataSource: { url: '/index.php/apps/myapp/api/charts/sla' }
    // dataSource: { register: 'cases', schema: 'case', groupBy: 'caseType', aggregate: 'count' }
  },
}]
```

Forwarded `props` keys (everything else is ignored): `chartKind` (→ `type`), `series`, `categories`, `labels`, `options`, `colors`, `toolbar`, `legend`, `height`, `width`, `unavailableLabel`.

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
| `dateRange` | Object | `null` | Optional date-range header descriptor — see [Date-range header](#date-range-header) |
| `pageFilters` | Array | `[]` | Optional page-level filter controls rendered in the header — see [Page filters](#page-filters). Each entry `\{ key, label?, type?: 'select', options: [\{ value, label \}], default? \}`. The selection is written into the reactive workspace context, so widgets can read it via a `@page.<key>` / `@workspace.<key>` token. |

#### Widget definition

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique widget identifier |
| `title` | String | Widget title shown in the wrapper header |
| `type` | String | `'custom'` (default), `'tile'`, or `'chart'`. `'chart'` mounts CnChartWidget; chart inputs ride `props` |
| `props` | Object | Free-form widget-specific props. For chart widgets: `{ chartKind, series, categories, labels, options, colors, toolbar, legend, height, width, unavailableLabel, dataSource? }` |
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
| `flush` | Boolean | Whether the widget body renders flush — edge-to-edge with **no** wrapper content padding. **Default `true`** for dashboard content widgets (tables, KPIs, charts, custom/integration), so a borderless table or KPI meets the card edges. Set `flush: false` to restore the padded box for content that needs breathing room. |
| `dateChip` | Boolean | Show the per-widget date-range chip (see [Per-card date chip](#per-card-date-chip-layoutdatechip)) |
| `showActions` | Boolean | Forwarded to CnWidgetWrapper — set `false` to drop the header overflow menu on compact tiles |
| `styleConfig` | Object | Style overrides passed to CnWidgetWrapper |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `layout-change` | `layout[]` | Emitted when the user drags or resizes a widget; payload is the full updated layout array |
| `edit-toggle` | `boolean` | Emitted when the Edit/Done button is clicked; payload is the new editing state |
| `date-range-change` | `{ from, to, preset }` | Emitted on every range change AND on mount when the date-range feature is enabled. Tracks the picker's current value. |
| `page-filter-change` | `{ key, value }` | Emitted when a [page filter](#page-filters) selection changes. The value is also written into the reactive workspace context. |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `header-actions` | — | Extra buttons in the page header (right side) |
| `widget-{widgetId}` | `{ item, widget }` | Custom content for a specific widget |
| `widget-{widgetId}-actions` | `{ item, widget }` | Header action buttons for a specific widget |
| `widget-{widgetId}-title-icon` | `{ item, widget }` | Extra icon in the widget header; position and color controlled by `titleIconPosition` / `titleIconColor` on the widget definition |
| `empty` | — | Custom empty state when no layout items exist |

## Date-range header

When the `dateRange` prop is set with `enabled: true`, the dashboard renders a [`CnDateRangePicker`](./cn-date-range-picker.md) between the page header and the widget grid. The selected range is:

- emitted on every change via `@date-range-change`,
- optionally persisted to `localStorage` (when `persistKey` is set),
- provided to every descendant widget through the `cnDashboardDateRange` injection key as a reactive Vue ref,
- published into the page-level workspace context as `dateFrom` / `dateTo` / `datePreset`, so any declarative widget can scope itself to the active window via the optional filter tokens `@workspace.dateFrom?` / `@workspace.dateTo?` (see [Re-scoping KPI counts](#re-scoping-kpi-counts-by-the-active-window)).

```vue
<CnDashboardPage
  title="Dashboard"
  :widgets="WIDGETS"
  :layout="layout"
  :date-range="{
    enabled: true,
    persistKey: 'myapp.dashboard.range',
    default: { preset: 'last-7' },
  }"
  @date-range-change="onRangeChange" />
```

### `dateRange` shape

| Field        | Type           | Description                                                                |
| ------------ | -------------- | -------------------------------------------------------------------------- |
| `enabled`    | Boolean        | When `true`, renders the picker row. When `false` / omitted, no row appears. |
| `control`    | String (opt.)  | Header control style: `'picker'` (default — `CnDateRangePicker`: a preset select + two date inputs) or `'pills'` (a compact segmented toggle-button row). |
| `default`    | Object (opt.)  | Initial `{ from, to, preset? }` when no persisted state is found.          |
| `persistKey` | String (opt.)  | When set, the chosen range is persisted to `localStorage[persistKey]`.     |
| `presets`    | Array (opt.)   | Override the preset list. See [`DEFAULT_DATE_RANGE_PRESETS`](../utilities/default-date-range-presets.md). A preset with no numeric `days` / `hours` (other than the manual `custom` entry) — e.g. `{ id: 'all', label: 'All', days: null }` — or one with `clear: true` is an "All" / clear option that removes the window. |

The resolution order is: explicit `default` → rehydrated `localStorage` (when `persistKey` set) → `last-7` preset (`now − 7d → now`).

### Re-scoping KPI counts by the active window

The chosen range is published into the page-level workspace context as
`dateFrom` / `dateTo` / `datePreset`. A declarative widget (e.g. a `stat`
KPI tile) scopes its query to the window by referencing the OPTIONAL tokens in
its `source.filter` on whichever date field it tracks:

```jsonc
{
  "type": "stat",
  "content": {
    "label": "Decisions",
    "route": { "name": "Decisions" },
    "source": {
      "register": "decidesk", "schema": "decision", "metric": "count",
      "filter": {
        "decisionDate": { "gte": "@workspace.dateFrom?", "lte": "@workspace.dateTo?" }
      }
    }
  }
}
```

The trailing `?` marks each token OPTIONAL: when the "All" preset clears the
window (empty bounds) the token stays unresolved and is dropped, so the date
filter is omitted and the tile shows its unfiltered count.

### Per-card date chip (`layout[].dateChip`)

Instead of (or alongside) the page-level header control, a KPI card can carry
its own period selector. Set `dateChip: true` on the widget's **layout** entry.
When the card shows its header (`showTitle` not `false`) the chip sits in the
header next to the title; on a **flush** card (`showTitle: false`) it floats in
the top-right corner over the content — so a compact KPI tile keeps its clean
look and still gets a date selector. This works for the registered card widgets
(`stat` / `gauge` / `delta`) and any custom-slot widget. The chip opens the same preset popover and drives the same shared
dashboard range, so every card stays in sync. Its label shows the active
preset (e.g. `7d` / `30d` / `All`) and it stays clickable even on the
unbounded "All" range. Pair with `dateRange.showHeaderPicker: false` to drop
the page-level control and rely solely on the per-card chips:

```jsonc
{
  "config": {
    "dateRange": {
      "enabled": true,
      "showHeaderPicker": false,
      "default": { "preset": "all" },
      "presets": [
        { "id": "last-7", "label": "7d", "days": 7 },
        { "id": "last-30", "label": "30d", "days": 30 },
        { "id": "all", "label": "All", "days": null }
      ]
    },
    "layout": [
      { "id": "1", "widgetId": "decisions-kpi", "gridX": 0, "gridY": 0, "gridWidth": 3, "gridHeight": 2, "showTitle": true, "dateChip": true }
    ]
  }
}
```

A preset with no numeric `days` / `hours` (other than `custom`) — e.g.
`{ id: "all", days: null }` — or one flagged `clear: true` clears the window.

### Pills control (`control: 'pills'`)

`control: 'pills'` replaces the bulky select + two date inputs with a compact
segmented toggle row — one pill per preset, rendered as `role="group"` with
`aria-pressed` on the active pill (WCAG-friendly toggle group). A
de-emphasised "Custom range" pill (dashed outline) opens a small from/to
popover, so the arbitrary-window affordance stays without two bare date inputs
sitting in the header. The active pill drives the same shared dashboard range
as the default picker — no other wiring changes.

```vue
<CnDashboardPage
  :date-range="{
    enabled: true,
    control: 'pills',
    default: { preset: 'last-30' },
    presets: [
      { id: 'last-7', label: 'Last 7 days', days: 7 },
      { id: 'last-30', label: 'Last 30 days', days: 30 },
      { id: 'last-90', label: 'Last 90 days', days: 90 },
      { id: 'custom', label: 'Custom range', days: null },
    ],
  }" />
```

### `cnDashboardDateRange` provide / inject

`CnDashboardPage` always provides `cnDashboardDateRange` — even when the feature is off — so descendants can inject without a fallback dance:

```js
import { inject, ref } from 'vue'

export default {
  setup() {
    const range = inject('cnDashboardDateRange', ref(null))
    // range.value is `{ from, to, preset }` when the feature is on,
    // and `null` when it's off.
    return { range }
  },
}
```

`CnChartWidget` consumes this injection automatically — see its [bucket data-source documentation](./cn-chart-widget.md#bucket-shorthand-time-series).

## Page filters

The `pageFilters` prop renders page-level select controls in the dashboard header. Each selection is written into the **reactive workspace context** (the same `cnWorkspaceContext` provide widgets read), so any widget can react to it through a `@page.<key>` / `@workspace.<key>` token. This is how a single period selector drives every endpoint-bound KPI on the page.

```vue
<CnDashboardPage
  title="Analytics"
  :widgets="WIDGETS"
  :layout="layout"
  :page-filters="[
    {
      key: 'period',
      label: 'Period',
      type: 'select',
      default: 'last-30',
      options: [
        { value: 'last-7', label: 'Last 7 days' },
        { value: 'last-30', label: 'Last 30 days' },
      ],
    },
  ]"
  @page-filter-change="onPeriodChange" />
```

A widget then binds its data to the selected value. With an endpoint-bound [`stat` widget](#widget-types):

```jsonc
{
  "id": "leads", "type": "stat",
  "content": {
    "label": "Leads",
    "source": { "kind": "endpoint", "url": "/api/analytics/summary", "path": "totalLeads", "params": { "period": "@page.period" } }
  }
}
```

Each entry: `key` (the context key written on change), optional `label`, `type` (only `'select'` today), `options` (`[{ value, label }]`), and an optional `default` (else the first option seeds the context on mount). Omitting `pageFilters` renders nothing and leaves the context untouched (backwards-compatible).

## Built-in page-level Actions menu

The dashboard header carries the shared [`CnActionsMenu`](./cn-actions-menu) overflow `…` — **Refresh**, **Documentation**, and **Request a feature** — next to the edit toggle. This is the **page-level** menu, distinct from each widget's own menu (the per-widget ones emit `@widget-refresh` / `@widget-request-feature`).

- **Refresh** emits `@refresh` and, unless suppressed via `event.preventDefault()`, fires the `cn:page:refresh` event-bus channel with `{ widgetId, title }`.
- **Documentation** renders only when `documentationUrl` is set, opening it in a new tab.
- **Request a feature** opens `CnSuggestFeatureModal` with `surface: "dashboard:<id>"` when mounted under `CnAppRoot`.

Refresh and Request-a-feature are on by default for the page-level menu; opt out with `:show-refresh="false"` / `:show-request-feature="false"`. Set `:page-id` for a stable id/surface.

### Per-widget Refresh

Each widget's own overflow menu shows Refresh based on `widgetShowRefresh` (tri-state, default `null` = **auto**). For **custom-slot** widgets, auto shows Refresh only when the app attached a `@widget-refresh` listener that will handle it — so a dashboard that refreshes centrally by another route (e.g. a header button bumping a shared signal) gets no dead per-widget buttons. Force all custom widgets on/off with `:widget-show-refresh="true"`/`false`. Built-in **chart / NC / integration** widgets always show Refresh (they refresh via the `cn:widget:refresh` bus or their renderer).

`:show-refresh="false"` (or `config.showRefresh: false` in a manifest) **also** drops the Refresh item from every **widget's** own overflow menu — handy for a read-only dashboard whose widgets have no refetch wired (Request-a-feature stays). A widget can override this individually with `showRefresh` / `hideRefresh` on its `widgets[]` definition or `layout[]` entry:

```js
// page Refresh off, but this one widget keeps it
widgets: [{ id: 'live-feed', type: 'custom', showRefresh: true }]
// page Refresh on, but drop it from a static section
widgets: [{ id: 'revenue-over-time', type: 'custom', hideRefresh: true }]
```

Each **per-widget** menu also surfaces a **Documentation** item. Its URL resolves to the widget def's own `documentationUrl` when set, otherwise it inherits the page-level `documentationUrl` — so a documented dashboard shows Documentation on every widget without per-widget config.

## In-body sections (`bodyWidgets`)

The `bodyWidgets` prop hosts **registered host-app section components** alongside the widget grid — the dashboard equivalent of [`CnDetailPage`'s `bodyWidgets`](./cn-detail-page#in-body-sections-bodywidgets). This is how a bespoke analytics dashboard (a custom funnel / time-series / channel-bar chart that reads its own REST endpoint) becomes a `type: "dashboard"` page **without rewriting the charts** — the chart stays a registered component and surfaces as an in-body section.

Each section resolves its `component` from the v2 `cnRegistry` (any entry exposing a `.component`) first, then the legacy `cnCustomComponents` map — the same resolver `type: "custom"` pages use. No sidebar tab is required (unlike integration widgets). A name in neither registry renders an inline error; the page never breaks. Reuses [`CnBodySections`](./cn-body-sections).

```jsonc
{
  "type": "dashboard",
  "config": {
    "bodyWidgets": [
      { "id": "funnel", "component": "ConversionFunnel", "title": "Funnel",
        "placement": "before-grid",
        "props": { "period": "@workspace.period", "currency": "@config.currency" } },
      { "id": "channels", "component": "ChannelBarChart", "placement": "after-grid", "colSpan": 6 }
    ]
  }
}
```

- **`placement`** — `before-grid` (above the grid, renders even when there are no grid widgets), `after-grid` (below it), or `end` (the default; the last body content). Each section renders exactly once.
- **`props`** — token-resolved against the page context: `@workspace.<key>` / `@page.<key>` (page-level workspace state, e.g. a `pageFilters` selection), `@config.<key>` (app config, see below), plus the time / `@me` / `@objectId` tokens. An unresolved optional token (`@workspace.<key>?`) is dropped so the child sees `undefined`.
- **`colSpan`** — 1–12 grid span when sections at one placement share a row.

The section context (`{ register, schema, objectId, workspace, config }`) is also `provide`d on `cnSectionContext`, so a section component can `inject('cnSectionContext')` instead of taking explicit props. The optional object scoping (`register` / `schema` / `objectId`) comes from `integrationContext`.

## App config tokens (`@config.<key>`)

The `appConfig` prop is a page-level config map exposed to declarative widget / section config via the **`@config.<key>` token**, and `provide`d to descendants on `cnAppConfig`. Its primary use is making a setup-wizard-captured value (e.g. the reporting **currency**) actually format the dashboards instead of a hard-coded `EUR`:

```jsonc
{
  "id": "revenue", "type": "stat",
  "content": {
    "label": "Revenue",
    "source": { "kind": "endpoint", "url": "/api/finance/revenue", "path": "total" },
    "format": { "style": "currency", "currency": "@config.currency", "decimals": 0 }
  }
}
```

```vue
<CnDashboardPage :widgets="WIDGETS" :layout="layout" :app-config="appConfig" />
```

A manifest renderer typically seeds `appConfig` from `loadState(appId, 'config', {})`. `@config.<key>` also interpolates into an endpoint source's URL / params and into OpenRegister filter values. It is **backwards-compatible**: a literal `"EUR"` still works, and a required `@config.<key>` that is unset falls back to the format's default (`EUR` for currency, empty for prefix/suffix) rather than rendering the raw token. A trailing `?` marks the token optional (dropped from filters when unset).

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnDashboardPage.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnDashboardPage/CnDashboardPage.vue) and update automatically whenever the component changes.

<GeneratedRef />
