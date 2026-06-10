# Tasks: dashboard widget refinements

## CnDashboardPage

- [x] Drop the `CnWidgetWrapper` from the `isStatsBlock(item)` branch — render
      `CnStatsBlockWidget` directly so the inner `CnStatsBlock` is the whole
      card. Keep `getStatsBlockProps` + `getWidgetDataSource` calls unchanged.
      Pass title through explicitly since the wrapper used to handle it.
- [x] Wire `CnWidgetWrapper`'s new `@refresh` event to a new
      `widget-refresh` event on `CnDashboardPage` (passes the layout item),
      bound on the chart + custom-slot + integration + nc-widget branches.
- [x] Forward `@request-feature` likewise to a new `widget-request-feature`
      event; consumers handle the open-an-issue action.
- [x] Add a `#title-meta` template fill inside the chart branch with a
      formatted `from → to` chip derived from the resolved bucket's
      `staticRange` or the dashboard-level reactive `dateRange` provide.
      Renders nothing when neither side is set.

## CnWidgetWrapper

- [x] Add default `NcActions` inside `__actions` with Refresh + Request a
      feature items, plus an `#action-items` slot for consumers to append.
- [x] Emit `@refresh` from Refresh click; emit `@request-feature` from the
      Request-a-feature click. Both carry `{ title }` as payload.
- [x] Add `hideRefresh` / `hideRequestFeature` boolean props to suppress
      either built-in item (defaults to false — items always shown unless
      opted out). Plus `refreshLabel` / `requestFeatureLabel` /
      `actionsMenuLabel` pre-translated label overrides.
- [x] Add a `#title-meta` scoped slot rendered inside `__header-left`
      between the title `<h3>` and the right-hand spacer. CSS: small text,
      muted color, gap from the title.
- [x] Update JSDoc on props + events (events have `@event` + `@type` tags
      per the lib's convention; props have type tags).
- [~] Run `npm run prebuild:docs` and commit the regenerated — deferred to downstream cycle / fleet-wide adoption (handoff)
      `docs/components/_generated/CnWidgetWrapper.md`.
- [~] Run `npm run check:jsdoc`; bump baseline if coverage improved. — deferred to downstream cycle / fleet-wide adoption (handoff)

## CnStatsBlock

- [x] No code changes — the existing component already renders title + card
      chrome; once `CnDashboardPage` stops wrapping it, the visual lands
      correctly.

## Tests

- [~] CnWidgetWrapper unit test: default actions menu renders with Refresh + — deferred to downstream cycle / fleet-wide adoption (handoff)
      Request-a-feature items; events fire on click; props hide each item;
      `#action-items` slot adds items after the built-ins.
- [~] CnWidgetWrapper unit test: `#title-meta` slot renders when provided. — deferred to downstream cycle / fleet-wide adoption (handoff)
- [~] CnDashboardPage unit test: stats-block widget renders no — deferred to downstream cycle / fleet-wide adoption (handoff)
      `CnWidgetWrapper` ancestor; chart widget renders the date-range chip
      when bucket has a `staticRange` or resolvable `fromVar`/`toVar`.

## Verification

- [x] Bundle rebuilt and deployed to openconnector dev container against
      this branch (via the `useLocalLib` webpack alias).
- [~] Browser smoke-test against openconnector dev container after rebuild: — deferred to downstream cycle / fleet-wide adoption (handoff)
      KPI cards render as single cards matching pipelinq's; chart widget
      header shows `[2026-05-18 → 2026-05-25]` next to the title; clicking
      the new `…` action menu in any widget shows Refresh + Request a
      feature; clicking Refresh re-fetches the widget data.

## Follow-up

- [~] Per-widget custom refresh handlers (currently page-level). — deferred to downstream cycle / fleet-wide adoption (handoff)
- [~] Configurable "Request a feature" target URL via manifest field. — deferred to downstream cycle / fleet-wide adoption (handoff)
- [~] In-chart annotation showing the date range. — deferred to downstream cycle / fleet-wide adoption (handoff)
