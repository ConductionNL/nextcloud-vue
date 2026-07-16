## Why

The dashboard date-range header renders a `CnDateRangePicker` — a "Range preset"
`NcSelect` plus two always-visible `YYYY-MM-DD` date inputs. On a KPI-led
dashboard (pipelinq's Commercial overview being the driver) that control is
bulky: it opens a tall header band above the KPI cards and reads as a heavy
form control for what is, in practice, a quick "last 7 / 30 / 90 / 365 days"
toggle.

Separately, the abstract single-metric registry widgets (`stat`, `gauge`,
`delta`) render inside `CnWidgetWrapper`, whose content area is
`overflow: auto` with fixed `16px` padding. On a short two-row tile that
clips: a gauge tile shows a vertical scrollbar, and a long currency KPI
(`€1,679,400`) shows a horizontal scrollbar — content overflowing the tile.

## What Changes

- **NEW** `dateRange.control` option on `CnDashboardPage` (`'picker' | 'pills'`,
  default `'picker'`). `'pills'` replaces the select + two date inputs with a
  compact segmented toggle-button row — one pill per preset, rendered as a
  `role="group"` with `aria-pressed` on the active pill (WCAG-friendly toggle
  group), plus a de-emphasised "Custom range" popover pill (dashed outline)
  carrying the from/to inputs. The active pill drives the same shared
  `currentRange` / `cnDashboardDateRange` as the default picker via the
  identical `onDateRangeChange` handler — no other wiring changes. Backwards
  compatible: omitting `control` keeps the existing picker.
- **NEW** `card: true` hint on a dashboard-widget-registry entry, marking a
  widget as a self-contained card surface. `CnStatWidget`, `CnGaugeWidget`,
  and `CnDeltaWidget` set it.
- **MODIFIED** `CnDashboardPage` registry-widget rendering: a `card` widget is
  rendered `flush` (no wrapper padding) with a `cn-dashboard-page__card-fit`
  class that switches the wrapper content area to centred,
  non-scrolling layout (`overflow: hidden`, vertical centre, comfortable
  padding) and lets the card shrink to the tile — fixing the stray
  vertical / horizontal scrollbars on KPI / gauge tiles.
- **MODIFIED** `CnStatWidget` styling so a long value truncates with an
  ellipsis instead of forcing the tile wider (min-width:0 on the value row,
  slightly smaller value font / icon / gap).

All changes are additive and backwards compatible — every new option defaults
to today's behaviour, and existing dashboards are unchanged.
