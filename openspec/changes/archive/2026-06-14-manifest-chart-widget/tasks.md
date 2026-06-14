# Tasks: manifest-chart-widget

## Library (`@conduction/nextcloud-vue`)

- [x] **Add chart-widget detection helper** in
      `src/components/CnDashboardPage/CnDashboardPage.vue`:
      `isChart(item)` returns true when the resolved widget definition
      has `type === 'chart'`.

- [x] **Wire chart branch into the widget dispatcher** with priority
      order: tile → custom slot → chart → NC API → unknown fallback.
      Custom slot still wins over chart (escape hatch).

- [x] **Forward props** to `CnChartWidget` with `chartKind → type`
      rename. Pass through `series`, `categories`, `labels`, `options`,
      `colors`, `toolbar`, `legend`, `height`, `width`.

- [x] **Import `CnChartWidget`** in `CnDashboardPage.vue`'s component
      registry.

- [x] **JSDoc updates** on CnDashboardPage:
      - Document the chart widget shape under the `widgets` prop JSDoc.
      - Document the dispatcher priority order in the SFC's leading
        comment block.

- [x] **JSDoc updates** on CnChartWidget:
      - Add a "Manifest usage" section to the file-leading docblock.

- [x] **Unit test** covering:
      - Chart widget renders when `widgetDef.type === 'chart'`.
      - Dispatcher passes `chartKind` as the apex `type`.
      - Custom slot wins over chart branch when both present.
      - Unknown `chartKind` falls back to apexcharts' default behaviour
        (validator on CnChartWidget already rejects).

- [x] **Doc updates**:
      - `docs/components/cn-dashboard-page.md` — add a "Chart widget"
        subsection with manifest example.
      - `docs/components/cn-chart-widget.md` — add manifest example.

- [x] **Spec deltas** added to
      `openspec/specs/dashboard-page/spec.md` covering chart-widget
      detection + custom-slot precedence (delta lives in
      `openspec/changes/manifest-chart-widget/specs/dashboard-page/spec.md`).

- [x] **`npm test`** passes.

- [x] **`npm run check:docs`** passes (no new public exports — chart
      widget detection is internal to CnDashboardPage).

- [x] **`npm run lint`** passes (or `npm run lint:fix` clean).

## Consumer (`procest`)

- [x] Convert `DoorlooptijdDashboard.vue` to a thin wrapper that
      mounts `CnDashboardPage` with three chart widgets (donut, bar,
      line) + custom slots for KPIs, at-risk panel, and performance
      table.

- [x] Move chart series + options computation into a composable
      (`useDoorlooptijdCharts.js`) so the chart widgets receive
      already-computed `series` / `options` via the manifest's `props`.

- [x] Manual smoke test: `/index.php/apps/procest/doorlooptijd` renders
      with all three charts visible, no console errors.
