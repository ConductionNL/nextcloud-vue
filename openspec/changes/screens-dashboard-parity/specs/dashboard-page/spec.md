# dashboard-page Delta: screens-dashboard-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-dashboard-parity](../../)

## Purpose

Let a dashboard page draw the header, period group and KPI row of the
screens (canon sections 2 and 7) when the app takes the board look, and add
the two opt-in keys that need markup changes.

## ADDED Requirements

### Requirement: The board dashboard header

In the board look CnDashboardPage SHALL render its title as an `h1` of
28px/700 with line height 1.2 and its description as 15px text in
`--color-text-maxcontrast` on its own line under the title, 6px below it.
The header actions SHALL render in this order, left to right: the view
switch, the edit-layout toggle (secondary, outlined), the Actions menu
(labelled), the buildiq square, and the manifest's header actions with the
primary rightmost. The buttons SHALL be 40px high with a 10px gap. Without
the board look the header SHALL render as before (h2 of 20px, actions in
today's order).

#### Scenario: The primary ends the row

- **GIVEN** a board dashboard with a primary header action "New publication" and edit enabled
- **WHEN** the header renders
- **THEN** the buttons read Edit layout, Actions, buildiq, New publication, left to right

#### Scenario: The greeting goes in the subtitle

- **GIVEN** a board dashboard titled "Dashboard" with description "Good morning, Pieter · Wednesday 7 October 2026"
- **WHEN** it renders
- **THEN** the h1 reads "Dashboard" at 28px and the greeting sits under it at 15px

### Requirement: The period as a segmented group

CnDashboardPage SHALL accept `dateRange.control: "segmented"`. It SHALL
render the presets as one CnSegmentedControl of `size="compact"` with an
accessible name ("Period"), each preset a segment with `aria-pressed`, in a
row of its own between the header and the KPI row. Picking a segment SHALL
run the same range change as a pill does (persistence, `date-range-change`,
`cnDashboardDateRange`). A custom range, when offered, SHALL be the last
segment and SHALL open the from/to popover. The `"pills"` and default
controls SHALL keep working unchanged.

#### Scenario: Picking a quarter

- **GIVEN** a dashboard with `dateRange.control: "segmented"` and presets last-30 and quarter
- **WHEN** the user presses Quarter
- **THEN** Quarter has `aria-pressed="true"`, the others false, and `date-range-change` fires once with the quarter range

### Requirement: A compact segmented control

CnSegmentedControl SHALL take `size` (`"normal"` default, or `"compact"`).
Compact SHALL draw a track with 3px padding, a 2px gap, radius 8px and
`--color-background-dark` ground, and segments 34px high with 0 12px
padding, radius 6px and 14px/600 text; the pressed segment SHALL take
`--color-main-background` with a 1px 2px shadow. An icon-only segment SHALL
be 40px wide. Normal SHALL render as before.

#### Scenario: Compact height

- **GIVEN** a compact segmented control with four text segments
- **WHEN** it renders in a browser
- **THEN** the track is 40px high and each segment 34px

### Requirement: The board KPI tile

In the board look CnStatWidget in the stacked layout and CnStatsBlock with
`layout="stacked"` (both draw `cn-kpi-card--stacked`) SHALL draw a 14px label
in `--color-text-maxcontrast`, the value at 28px/700 with line height 1.1 in
the main text colour, and a note at 13px/400, with a 6px gap and the card's
padding at 18px 20px. The tile SHALL show its icon (18px, before the label)
only when the tile has a link, and no icon circle. A caption variant
(`captionVariant` or `captionVariantWhen`) SHALL colour the note only for
the warning, error or danger tone. Without the board look
the stacked layout SHALL keep today's 34px value.

#### Scenario: A link tile shows its icon

- **GIVEN** two board KPI tiles with an icon, one with `content.link` and one without
- **WHEN** they render
- **THEN** only the linked tile shows the icon, before its label

#### Scenario: Success is not coloured

- **GIVEN** a board KPI tile whose `captionVariantWhen` yields the success variant
- **WHEN** it renders
- **THEN** the note is grey

### Requirement: A KPI row above the grid

CnDashboardPage SHALL read `config.kpiRow` (a list of widget ids, default
empty). The named widgets SHALL render above the grid, in the listed order,
inside a CnKpiGrid with `columns="auto"`, and SHALL NOT be placed in the
GridStack grid. CnKpiGrid SHALL accept `columns: "auto"` and SHALL then lay
its tiles out as `repeat(auto-fit, minmax(200px, 1fr))` with a 16px gap. An
id in `kpiRow` that names no widget SHALL be skipped with a development
warning. Without `kpiRow` the page SHALL render as before.

#### Scenario: Four tiles on a wide screen, two on a narrow one

- **GIVEN** `kpiRow` with four stat widgets
- **WHEN** the page renders at 1240px content width and then at 700px
- **THEN** the tiles sit four in a row, then two per row, each at least 200px wide

#### Scenario: Edit mode leaves the row alone

- **GIVEN** a page with `kpiRow` in edit mode
- **WHEN** the user drags widgets in the grid
- **THEN** the KPI row neither moves nor appears in the emitted layout
