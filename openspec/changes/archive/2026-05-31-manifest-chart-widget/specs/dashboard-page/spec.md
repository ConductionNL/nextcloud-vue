---
status: proposed
---

# CnDashboardPage Chart Widget Specification (delta)

## Purpose

This delta extends `CnDashboardPage`'s widget dispatcher with a fourth
branch that mounts `CnChartWidget` for any widget definition declaring
`type: 'chart'`. The chart widget is manifest-friendly: every chart
input rides `widgetDef.props` so an entire dashboard's visualisations
can be declared in JSON without per-app component code.

The branch sits **after** the custom-slot branch — apps that provide
`#widget-{id}` for a chart-typed widget keep the slot path as an escape
hatch for apexcharts features outside the manifest contract.

---

## ADDED Requirements

### Requirement: chart widget detection

CnDashboardPage SHALL resolve a widget as a chart widget when the
widget definition has `type: 'chart'` AND no `#widget-{id}` scoped slot
is provided for that widget id. Detection runs after tile detection and
custom-slot detection, before NC Dashboard API detection.

#### Scenario: chart widget detected

- GIVEN a layout item with `widgetId: 'sla-trend'` and the matching
  widget definition has `type: 'chart'` AND `props: { chartKind:
  'line', series: [{ name: 'SLA %', data: [80, 85, 90] }],
  categories: ['Jan', 'Feb', 'Mar'] }`
- AND no `#widget-sla-trend` scoped slot is provided
- WHEN the grid renders that item
- THEN `CnChartWidget` is rendered inside a `CnWidgetWrapper`
- AND CnChartWidget receives `type: 'line'` (mapped from `chartKind`),
  the same `series`, and the same `categories`

#### Scenario: tile widget still wins

- GIVEN a widget definition with `type: 'tile'` (not 'chart')
- WHEN the grid renders the item
- THEN `CnTileWidget` is rendered (tile branch wins over chart branch)

#### Scenario: custom slot beats chart branch

- GIVEN a widget definition with `type: 'chart'` AND
  `#widget-{widgetId}` scoped slot is provided
- WHEN the grid renders the item
- THEN the scoped slot content is rendered (custom slot wins)
- AND CnChartWidget is NOT mounted

#### Scenario: NC Dashboard API still triggers when type is not chart

- GIVEN a widget definition with `type: 'calendar'` and
  `itemApiVersions: [1, 2]`
- WHEN the grid renders the item
- THEN `CnWidgetRenderer` is rendered (chart branch is skipped because
  `type !== 'chart'`)

---

### Requirement: chart widget prop forwarding

CnDashboardPage SHALL forward chart-relevant entries from
`widgetDef.props` to the mounted `CnChartWidget`, translating
`chartKind` into apexcharts' `type` to avoid colliding with
`widgetDef.type`'s dispatcher meaning.

#### Scenario: chartKind translates to type

- GIVEN `widgetDef.props.chartKind` is `'donut'`
- WHEN CnChartWidget is mounted
- THEN it receives `type: 'donut'` (NOT `chartKind: 'donut'`)

#### Scenario: series and categories pass through

- GIVEN `widgetDef.props.series` is `[{ name: 'A', data: [1, 2] }]` and
  `widgetDef.props.categories` is `['x', 'y']`
- WHEN CnChartWidget is mounted
- THEN it receives the same `series` array and `categories` array

#### Scenario: pie/donut labels pass through

- GIVEN `widgetDef.props.labels` is `['Active', 'Closed']` and
  `widgetDef.props.chartKind` is `'donut'`
- WHEN CnChartWidget is mounted
- THEN it receives `labels: ['Active', 'Closed']` and `type: 'donut'`

#### Scenario: options deep-merge preserved

- GIVEN `widgetDef.props.options` is `{ stroke: { width: 3 } }`
- WHEN CnChartWidget is mounted
- THEN it receives `options: { stroke: { width: 3 } }` (CnChartWidget
  itself deep-merges with its built-in defaults)

#### Scenario: dataSource is round-tripped but not read

- GIVEN `widgetDef.props.dataSource` is `{ url: '/api/charts/sla' }`
- WHEN CnChartWidget is mounted
- THEN no fetch is initiated by the dispatcher
- AND `widgetDef.props.series` (if provided) is the source of truth for
  the chart contents

---

### Requirement: declarative chart manifest contract

CnDashboardPage SHALL accept a manifest dashboard whose `widgets[]`
includes one or more `type: 'chart'` entries with no consumer-side slot
overrides.

#### Scenario: declarative-only dashboard renders

- GIVEN `pages[]` contains `{ type: 'dashboard', config: { widgets:
  [{ id: 'w1', type: 'chart', title: 'app.t.trend', props: { chartKind:
  'line', series: [{ data: [1, 2, 3] }] } }], layout: [{ id: 1,
  widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }] }
  }`
- AND no `#widget-w1` slot is provided
- WHEN the page renders
- THEN one chart widget appears in the grid
- AND CnChartWidget is mounted with `type: 'line'` and the supplied
  series

---

### Requirement: chartKind closed-enum delegated to CnChartWidget

CnDashboardPage SHALL pass `chartKind` through to CnChartWidget without
its own validation. CnChartWidget already validates its `type` prop
against the closed enum `['area', 'line', 'bar', 'pie', 'donut',
'radialBar']`; the dispatcher does not duplicate that check.

#### Scenario: invalid chartKind triggers CnChartWidget validator

- GIVEN `widgetDef.props.chartKind` is `'sankey'` (not in the apex enum)
- WHEN CnChartWidget is mounted
- THEN Vue logs the prop validator warning from CnChartWidget
- AND the dispatcher itself emits no error
