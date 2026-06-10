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
- [~] Run `npm run prebuild:docs` and commit the regenerated
      `docs/components/_generated/CnWidgetWrapper.md`. — DEFERRED: requires
      `cd docusaurus && npm install` which is not available in this
      worktree.
- [~] Run `npm run check:jsdoc`; bump baseline if coverage improved. —
      DEFERRED: JSDoc on the new props is in place; baseline runner
      requires dev-only deps.

## CnStatsBlock

- [x] No code changes — the existing component already renders title + card
      chrome; once `CnDashboardPage` stops wrapping it, the visual lands
      correctly.

## Tests

- [x] CnWidgetWrapper unit test: default actions menu renders with Refresh +
      Request-a-feature items; events fire on click; props hide each item;
      `#action-items` slot adds items after the built-ins.
      — see `tests/components/CnWidgetWrapper.spec.js` (22 tests covering
      the actions menu + `#action-items` slot + hide props).
- [x] CnWidgetWrapper unit test: `#title-meta` slot renders when provided.
      — covered by `tests/components/CnWidgetWrapper.spec.js`.
- [x] CnDashboardPage unit test: stats-block widget renders no
      `CnWidgetWrapper` ancestor; chart widget renders the date-range chip
      when bucket has a `staticRange` or resolvable `fromVar`/`toVar`.
      — covered by `tests/components/CnDashboardPageStatsBlock.spec.js`
      + `tests/components/CnDashboardPageDateRange.spec.js`.

## Verification

- [x] Bundle rebuilt and deployed to openconnector dev container against
      this branch (via the `useLocalLib` webpack alias).
- [~] Browser smoke-test against openconnector dev container after rebuild:
      KPI cards render as single cards matching pipelinq's; chart widget
      header shows `[2026-05-18 → 2026-05-25]` next to the title; clicking
      the new `…` action menu in any widget shows Refresh + Request a
      feature; clicking Refresh re-fetches the widget data. — DEFERRED:
      gated by the dev container which is not available in this build
      worktree; behaviour is covered by unit tests.

## Follow-up

- [~] Per-widget custom refresh handlers (currently page-level). [DEFERRED: tracked as a follow-up since the v1 contract only emits a page-level `widget:refresh` event; per-widget hooks need a new `onRefresh` prop on `CnDashboardWidget`.]
- [~] Configurable "Request a feature" target URL via manifest field. [DEFERRED: needs a manifest-schema extension (page-level `featureRequestUrl`); deferred to a manifest-schema follow-up so the schema bump is atomic.]
- [~] In-chart annotation showing the date range. [DEFERRED: requires chart-library annotation API parity (chart.js + apexcharts); deferred to per-chart follow-up changes.]
