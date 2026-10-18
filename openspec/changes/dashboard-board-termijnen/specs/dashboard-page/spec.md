# dashboard-page Delta: dashboard-board-termijnen

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-board-termijnen](../../)

## Purpose

Draw the header, the KPI row and the description controls of dossiq's DqTermijnen, DqDoorlooptijd and DqProcesanalyse boards.

## ADDED Requirements

### Requirement: The board dashboard header keeps its actions on the title row

Under the board look CnDashboardPage SHALL draw its header actions on the title's row, right-aligned, and its breadcrumb trail and description (with a period group or page filters on that line) under both, at the header's full width. The title column SHALL NOT shrink below its longest word; the actions SHALL wrap their buttons first. Without the board look the header SHALL render as before.

#### Scenario: Termijnen at 860px

- **GIVEN** a board dashboard "Termijnbewaking" with two header actions and the description "Week 41 · alle teams" followed by a segmented period group
- **WHEN** it renders 860px wide
- **THEN** the actions sit on the title's row, and the description and the period group sit on one line under them, as wide as the header

### Requirement: A board KPI row tile has the board's inset

Under the board look a stacked stat tile in the `kpiRow` SHALL sit 18px 20px inside its card, with no further padding from the card-fit cell. Tiles in the grid SHALL keep the card-fit padding.

#### Scenario: Lopende termijnen

- **GIVEN** a board dashboard whose `kpiRow` holds the stacked stat tile "Lopende termijnen"
- **WHEN** it renders
- **THEN** the label sits at most 24px from the tile's top and between 18px and 24px from its left edge

### Requirement: A page filter as a segmented group on the description line

A page filter with `control: "segmented"` SHALL render as a compact CnSegmentedControl, its option labels and its name through the host translate, and SHALL write the picked value into the workspace context as a select does. With `placement: "description"` the group SHALL sit on the description line, after the description and any period group; without it, or when the header is hidden, it SHALL sit in the filter row. An endpoint source's `responsePath` SHALL resolve `@workspace.<key>` tokens, and a token without a value SHALL block the read.

#### Scenario: Mean or median

- **GIVEN** a dashboard with the description "Alle zaaktypen", a page filter `measure` (Gemiddeld, Mediaan; `control: "segmented"`, `placement: "description"`) and a matrix whose `responsePath` is `phaseDays.@workspace.measure`
- **WHEN** the user presses Mediaan
- **THEN** the matrix reads `phaseDays.median` from the same response, without a second request
