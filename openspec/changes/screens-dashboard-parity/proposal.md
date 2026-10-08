---
kind: code
---

# Proposal: screens-dashboard-parity

## Summary

The dashboards on the screens open with an h1 of 28px (the page name, such
as "Dashboard" or "Today"), a 15px grey subtitle under it that carries the
greeting or the date, and the buttons right in a fixed order: Edit layout,
Actions, the buildiq square, the primary. Under the header sits the period
as a segmented group, then a row of KPI tiles in an auto-fit grid
(`minmax(200px, 1fr)`, gap 16): label 14 grey, value 28 bold, note 13. A tile
shows an icon only when it is a link to a filtered list. Coloured text in a
tile means a warning and nothing else.

CnDashboardPage, CnStatWidget, CnKpiGrid and CnSegmentedControl draw most of
this already, but not at these values:

- the title is an h2 of 20px and the description 14px;
- the header puts the manifest's header actions (often the primary) first
  and the Actions menu last, after buildiq;
- the period renders as a select plus two date inputs, or as separate round
  pills with a filled active pill (`dateRange.control: "pills"`);
- round two's stacked tile (`content.layout: "stacked"`) draws the value at
  34px, the caption at weight 500, and a tile has no rule for its icon;
- KPI tiles are GridStack items on the 12-column grid, so they do not
  reflow as an auto-fit row;
- CnSegmentedControl is 36px high with 4px padding, where the board group is
  34px with 3px padding and a 2px gap.

This change adds the board values behind the board look (`cnLook`, from
`screens-dialog-parity`) and two opt-in keys. A dashboard that sets nothing
renders as today.

1. The board dashboard header: h1 28/700, subtitle 15, button order.
2. The period as a segmented group (`dateRange.control: "segmented"`).
3. A compact size for CnSegmentedControl (`size: "compact"`).
4. The board KPI tile: value 28, the icon rule, the warning-only colour.
5. A KPI row above the grid (`config.kpiRow`), and `columns: "auto"` on
   CnKpiGrid.

The switch is `look: "board"` from `screens-chrome-parity` (#1391); this
PR's `screens-dialog-parity` makes it readable in code as `cnLook`.

## Reference screens

- `opencatalogi/OcDashboard` (header order, KPI row with link icons):
  https://identity.conduction.nl/screens/board?id=opencatalogi/OcDashboard
- `pipelinq/PqDashboard` (KPI tiles without icons):
  https://identity.conduction.nl/screens/board?id=pipelinq/PqDashboard
- `dossiq/DqDashboard` (greeting in the subtitle):
  https://identity.conduction.nl/screens/board?id=dossiq/DqDashboard
- `pipelinq/PqForecast` (period group under the header):
  https://identity.conduction.nl/screens/board?id=pipelinq/PqForecast
- `pipelinq/PqOperationeel` (period group and KPI row):
  https://identity.conduction.nl/screens/board?id=pipelinq/PqOperationeel

Canon: sections 2 (dashboard header) and 7 of `UNIFORM-canon.md`.

## Builds on

- `screens-chrome-parity` (#1391): the `look: "board"` switch, the
  `cn-look-board` class and `src/css/look-board.css`.
- `openspec/specs/dashboard-page` ("page header rendering", "date-range
  pills control", "card-fit registry widgets") and
  `openspec/specs/dashboard-grid`.
- `add-dashboard-date-range-and-chart-bucket` (the `dateRange` state and
  `cnDashboardDateRange`); the segmented control drives the same state.
- `workplace-dashboard-primitives` (CnSegmentedControl, the greeting header,
  the attention card for "First today").
- `zuiddrecht-pixel-gaps` (hide the header row), `-2` (stacked stat tile,
  ground greeting, `showWidgetActions`), `-3` (stacked stats block).
- `screens-dialog-parity` (this PR) for `cnLook`.

## Affected consumers

Every app with a dashboard page: dossiq, pipelinq, opencatalogi, decidiq,
learniq, buildiq, keepiq, launchpad.

## Backward compatibility

Additive. The h1 applies only in the board look; an app whose shell already
has an h1 keeps `showHeader: false` (round one). The 34px stacked value
stays the default of `content.layout: "stacked"`; the 28px value comes from
the board look and the `--cn-kpi-stacked-value-size` token.

## Theming

Nextcloud variables only; the segmented track uses
`--color-background-dark`, the pressed segment `--color-main-background`.

## Out of scope

The "First today" card is the attention layout of CnBannerWidget
(`workplace-dashboard-primitives`); its blue edge and red-only-when-overdue
rule already follow `variant`. Horizontal bar rows are CnStackedBarWidget
and the chart widgets, matched in round three.
