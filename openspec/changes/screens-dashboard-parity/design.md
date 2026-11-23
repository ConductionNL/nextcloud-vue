# Design: screens-dashboard-parity

## Component and surface

`CnDashboardPage` (header, date range, KPI row), `CnStatWidget` and
`src/css/kpi-card.css` (tile), `CnKpiGrid` (auto columns),
`CnSegmentedControl` (compact size). Manifest schema: `dateRange.control`
gains `"segmented"`, page `config.kpiRow` is new.

## D1. A KPI row outside GridStack

GridStack places items on a 12-column grid with fixed spans. The board's
KPI row is an auto-fit CSS grid: four tiles at 1440px, two at 700px, one on a
phone, each at least 200px. Spans cannot express "as many 200px columns as
fit". Two options:

1. Teach CnDashboardGrid an auto-fit band. Rejected: GridStack's layout is
   serialised per user (`dashboard-layout-per-user`), and a band that
   reflows by width cannot round-trip through that format.
2. Render the KPI tiles named in `config.kpiRow` above the grid, in a
   CnKpiGrid with `columns: "auto"`, and leave them out of the grid.
   Chosen. The widgets keep their definitions, data sources and links; only
   their placement changes. In edit mode the row stays fixed and the grid
   below stays editable.

```json
"config": {
  "kpiRow": ["kpi-new", "kpi-waiting", "kpi-deadline", "kpi-published"],
  "dateRange": { "enabled": true, "control": "segmented", "presets": ["last-7", "last-30", "quarter", "year"] }
}
```

## D2. The tile icon follows the link

The canon: an icon only when the tile links to a filtered list. In the board
look CnStatWidget renders its icon as an 18px glyph before the label when
the tile has a link (`content.link` or `route`) and drops it otherwise,
whatever `content.icon` says. The icon circle beside the value (the
horizontal layout) is not drawn in the board look.

## D3. Warning-only colour

Round one added `content.captionVariant` and `content.captionVariantWhen` (a
stat tile can colour its caption by a rule). In the board look a rule may only produce the warning or error
tone; a success or info tone renders as the plain grey caption. The rule
still evaluates, so the screen reader text does not change.
