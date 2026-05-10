# Proposal: manifest-chart-widget

## Summary

Add a declarative `chart` widget primitive to `CnDashboardPage`'s widget
dispatcher and tighten `CnChartWidget` so a manifest-driven dashboard can
render charts via `widgets[{ type: "chart", ... }]` with no consumer-side
component code. Today every consumer mounts apexcharts directly and pins
their dashboard to `type: "custom"` because the lib has no declarative
chart primitive.

## Motivation

ADR-024 (App Manifest, fleet-wide adoption) closed the page-level `type`
enum to `index | detail | dashboard | custom`. Apps that need a chart on
their dashboard fall off the cliff at the *widget* level: the widget
dispatcher in `CnDashboardPage` recognises `tile`, `custom`, and NC
Dashboard API widgets — but not `chart`. Two production flows live in
that gap:

1. **procest `Doorlooptijd` (Processing Time Analytics)** — a 1066-line
   `DoorlooptijdDashboard.vue` mounting three apexcharts (donut,
   histogram, line) directly. To go manifest-driven the page would have
   to declare `type: "custom"` and ship its own component anyway, which
   defeats the manifest's purpose.
2. **opencatalogi Dashboard tile flows** — same shape: bespoke chart
   component imports `vue-apexcharts` and computes options inline.

A `type: "chart"` widget unblocks both: the manifest declares
`{ type: "chart", chartKind: "line"|"bar"|"donut"|"area"|..., series, options }`
and CnDashboardPage's dispatcher hands it to a CnChartWidget instance
without any per-app glue.

The lib v2 backlog row in ADR-024's "Consequences" / app-manifest
extensions discussion captures this as **chart widget primitive
(apexcharts) — procest Doorlooptijd, opencatalogi Dashboard**.

## Affected Projects

- [x] Project: `nextcloud-vue` — Wire `chart` into the `CnDashboardPage`
      widget dispatcher; small JSDoc + docs updates on `CnChartWidget`
      so manifest authors have a contract; tests.
- [x] Project: `procest` — Convert `Doorlooptijd` from
      `type: "custom"` to `type: "dashboard"` with three chart widgets.

## Scope

### In Scope

- **Widget dispatch**: extend `CnDashboardPage`'s widget dispatcher with
  a fourth branch — `isChart(item)` — that detects `widgetDef.type ===
  "chart"`, mounts `CnChartWidget` with props pulled from
  `widgetDef.props` + the layout item.
- **Manifest contract**: pin the widget API:
  ```
  {
    id: "doorlooptijd-trend",
    title: "procest.doorlooptijd.monthly_trend",
    type: "chart",
    props: {
      chartKind: "line"|"bar"|"donut"|"area"|"pie"|"radialBar",
      series: <Array — same shape as CnChartWidget series>,
      categories: <Array — same shape as CnChartWidget categories>,
      labels: <Array — same shape as CnChartWidget labels>,
      options: <Object — apexcharts options, deep-merged>,
      colors: <Array<string>>,
      toolbar: <Boolean>,
      legend: <Boolean>,
      height: <Number|String>,
      // dataSource is reserved — future cycle pulls register/schema or url
      dataSource: { url } | { register, schema, groupBy, aggregate }
    }
  }
  ```
- **CnChartWidget JSDoc/tests**: add a unit test for the dispatcher
  branch, document the manifest contract in `CnChartWidget.md`.
- **Procest migration**: replace `DoorlooptijdDashboard.vue`'s direct
  apexcharts mounts with a manifest dashboard page declaring three chart
  widgets (donut: SLA by case type; bar: processing time histogram;
  line: monthly SLA trend) plus the existing KPI / at-risk / table
  blocks via `type: "custom"` widgets that stay app-side.

### Out of Scope

- **dataSource resolver**: this change pins the manifest *shape* of
  `dataSource` (`{ url }` OR `{ register, schema, groupBy, aggregate }`)
  but does NOT implement the resolver. Procest's chart series stay
  computed app-side and pushed as the widget's `series` prop — the
  manifest is still declarative, just not yet OpenRegister-backed. A
  follow-up change wires `dataSource.url` (HTTP fetch) and
  `dataSource.{register, schema, groupBy, aggregate}` (OpenRegister
  aggregation) once the backend aggregation endpoint lands.
- **Widget settings UI**: app-builder-style chart customisation is
  ADR-024 v1 scope-deferred; revisit in a successor ADR.
- **opencatalogi Dashboard tile flows**: covered in a separate
  `opencatalogi-chart-widget` change once this lands.
- **Style configuration on chart widgets**: per-widget background
  colours / borders are deferred — apps theme via CSS today.

## Approach

1. **Library side** — Tighten the existing `CnChartWidget`:
   - Add JSDoc for `chartKind` (alias of `type`) so the manifest reads
     naturally without breaking `type` (back-compat).
   - Wire `CnDashboardPage`'s dispatcher to detect `type === "chart"` BEFORE
     the custom-slot / NC API branches; mount `CnChartWidget` passing the
     widgetDef.props through directly.
   - Translate `chartKind → type` inside the dispatcher so the manifest
     shape doesn't collide with apexcharts' own `type` reserved word.
   - Add unit tests for: (a) chart widget detection, (b) prop forwarding,
     (c) chartKind→type translation, (d) custom slot still wins when a
     `#widget-{id}` slot is provided alongside `type: "chart"` (escape
     hatch).

2. **Consumer side** — Convert procest's `Doorlooptijd`:
   - Add a manifest entry `{ id: "doorlooptijd", route: "/doorlooptijd",
     type: "dashboard", config: { widgets: [...], layout: [...] } }`.
   - Compute `donutSeries / histogramSeries / trendSeries` in a shared
     state module (Pinia store or composable) — the chart widgets read
     from there via the `props` indirection.
   - Keep KPIs, at-risk panel, performance table as `type: "custom"`
     widgets via `#widget-{id}` slots (out of scope for this change).
   - Remove the inline `<apexchart>` imports from
     `DoorlooptijdDashboard.vue`.

## Cross-Project Dependencies

- nextcloud-vue ships first; procest pulls via `npm pack` for the
  feature branch validation, then via the published beta tag once the
  lib PR lands.
- No backend changes required (dataSource resolver is deferred).

## Rollback Strategy

- Library: dispatcher branch is purely additive; reverting the
  CnDashboardPage edit removes chart support without affecting
  `tile` / `custom` / NC API widgets.
- Consumer: revert procest's Doorlooptijd to its previous bespoke
  apexchart mounts; the page route name stays the same.

## Decisions Made

- **`chartKind` over reusing `type`** — `type` is already reserved on
  `widgetDef` (it tells the dispatcher which branch to take), and
  apexcharts' own component prop is also called `type`. Using
  `chartKind` for the chart shape (line/bar/donut/area/pie/radialBar)
  is unambiguous and survives schema evolution.
- **Custom slot escape hatch wins** — when a consumer provides
  `#widget-{id}` slot AND the widgetDef declares `type: "chart"`, the
  custom slot wins. Apps that need bespoke chart behaviour (e.g.
  apexcharts annotations not covered by the `options` deep-merge) keep
  the slot path. The chart branch is the *default* for declarative use.
- **`props` carries every chart input** — consistent with the rest of
  the manifest (settings widgets, custom widgets), all chart inputs
  ride `widgetDef.props`. No new top-level fields on `widgetDef`.
- **dataSource shape is pinned now, resolver deferred** — recording
  `{ url }` vs `{ register, schema, groupBy, aggregate }` as the union
  shape avoids a schema bump when the resolver lands. Today, only
  `props.series` is read by the widget; `dataSource` is round-tripped
  through the manifest validator but unused at runtime.

## Open Questions

None.
