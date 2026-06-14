# Dashboard widget refinements — clean KPI cards + header action menu + chart date-range

## Why

Surfaced via openconnector's dashboard (#854 + #934). Three rough edges with the
current `CnDashboardPage` + `CnWidgetWrapper` + `CnStatsBlockWidget` chain:

1. **KPI cards render as a double card.** The built-in `isStatsBlock` template
   wraps `CnStatsBlockWidget` in a `CnWidgetWrapper` that ALSO renders a title
   (`<h3>`) + bordered card chrome. Then `CnStatsBlockWidget` renders
   `CnStatsBlock` which ALSO renders a title (`<h4>`) + its own bordered card.
   Visually: `Sources` text appears twice, nested cards stack. Apps like
   pipelinq sidestep this by declaring KPIs as `type: "custom"` + shipping a
   per-KPI Vue component that renders `CnStatsBlock` directly — boilerplate
   that should not be necessary for the lib's built-in stats-block type.
2. **No per-widget action menu.** Every dashboard widget needs a place to
   surface a refresh affordance and a "request a feature" link. The wrapper
   has an `__actions` div but it only renders when consumers explicitly pass a
   `#actions` slot — no sensible default. Consumers end up either redrawing
   the entire dashboard or skipping refresh entirely.
3. **Chart widgets show no date-range context.** When the dashboard's
   `dateRange.enabled` is on, charts read `from`/`to` via `useDataSource`'s
   reactive `dateRange` ref, but the rendered chart has no visible indication
   of which range the data covers. Users see "Outgoing calls — daily" with a
   chart and have to look at the global date-range picker at the top of the
   page to remember which window is being shown.

## What

- `CnDashboardPage`'s `isStatsBlock(item)` branch no longer wraps with
  `CnWidgetWrapper`. It renders `CnStatsBlockWidget` directly. `CnStatsBlock`
  already supplies title, count, breakdown, and the bordered card — that
  becomes the whole KPI tile.
- `CnWidgetWrapper` gains a default action menu inside its existing
  `__actions` div: an `NcActions` trigger with two built-in items, "Refresh"
  (emits `@refresh`) and "Request a feature" (emits `@request-feature`).
  Consumers can hide either via new boolean props (`hideRefresh`,
  `hideRequestFeature`) and can still inject more items via the existing
  `#actions` slot (rendered after the built-ins). `CnDashboardPage` wires
  `@refresh` to its existing refresh path and `@request-feature` to a new
  `request-feature` event the host app handles.
- `CnWidgetWrapper` gains a new scoped slot `#title-meta` rendered inside
  `__header-left` between the title and the right-hand spacer.
  `CnDashboardPage`'s chart branch passes a formatted date-range chip into
  the slot when the resolved bucket has a `from`/`to` pair.

## Non-goals (this PR)

- Per-widget custom refresh handlers (refresh is page-level for now).
- Configurable "Request a feature" target URL (defaults to opening the
  consuming app's issue tracker via `manifest.repositoryUrl` — apps without
  that field get the event but no default URL).
- Chart annotation showing the date range INSIDE the chart canvas (we only
  add it to the title bar — annotations are an apex-charts feature consumers
  can opt into independently).

## References

- openconnector#854 — dashboard KPIs + charts initial roll-out.
- openconnector#934 — header view-logs action (which surfaced how thin the
  current header is).
- pipelinq `src/views/dashboard/widgets/OpenLeadsKpiWidget.vue` — workaround
  pattern that should no longer be needed.
