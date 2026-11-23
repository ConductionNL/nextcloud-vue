# zuiddrecht-pixel-gaps-3 Delta: zuiddrecht-pixel-gaps-3

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [zuiddrecht-pixel-gaps-3](../../)

## Purpose

Close the third round of gaps between the Zuiddrecht boards and what the
shared library draws, without changing any app that does not opt in.

## ADDED Requirements

### Requirement: A ground greeting lines its switch up with the heading

A CnHeaderWidget with `content.ground: true` SHALL take its own height instead
of its grid cell's, so a `content.views` switch sits on the heading's line
(bottom-aligned with the h1, as DqDashboard draws it) whatever the cell's
height. Without `ground` the widget SHALL fill its cell as before.

#### Scenario: The switch sits beside the heading in a tall cell

- **GIVEN** a ground greeting with a view switch in a 200px cell
- **WHEN** it renders in a browser
- **THEN** the bottom of the switch is within 2px of the bottom of the heading

#### Scenario: A banner still fills its cell

- **GIVEN** a header widget without `ground`
- **WHEN** it renders
- **THEN** its height is 100% of the cell

### Requirement: A strip and a stacked bar can take the board inset

CnWeekStripWidget and CnStackedBarWidget SHALL take `content.inset: true`,
which draws the widget inside the board's inset: 16px above, 24px at the
sides, 22px below (theme hook `--cn-widget-board-inset`). Without the key they
SHALL run from card edge to card edge as before.

#### Scenario: The stacked bar starts 24px in

- **GIVEN** a stacked bar with `inset: true` in a card
- **WHEN** it renders in a browser
- **THEN** the bar starts 24px from the card's left edge and ends 24px from its right edge

### Requirement: The stages bar labels hold their line under a button theme

In the bars variant a clickable label SHALL keep zero padding, margin and
minimum width and SHALL ellipsize, also under a theme that restyles every
`button` with `!important` (thematiq's nldesign sheet) and under core's button
margin. Every label SHALL sit the same distance under its bar and none SHALL
run past its column.

#### Scenario: Eight long stages under the nldesign button rule

- **GIVEN** eight stages with long names, the current one a span, the rest buttons, under core's and nldesign's button rules
- **WHEN** they render in a browser
- **THEN** the label texts start within 1px of each other and no label is wider than its column

### Requirement: A breadcrumb can name the record by a field and use a text separator

CnDetailPage SHALL read `breadcrumb.currentField` (a dotted field path): the
current crumb SHALL be that field's value, falling back to the display name
when empty. CnBreadcrumbs SHALL take `separator` (default empty): a non-empty
separator SHALL be drawn between the crumbs instead of the chevron, and
CnDetailPage SHALL pass `breadcrumb.separator`. Without the keys the trail
SHALL end in the display name with chevrons.

#### Scenario: The case number after a slash

- **GIVEN** `breadcrumb: { label: "All cases", route: "Cases", currentField: "identifier", separator: "/" }` and a case with identifier `2026-0082`
- **WHEN** the detail page renders
- **THEN** the current crumb reads `2026-0082` and the separator is `/`

### Requirement: A detail page can drop the widget actions menu

CnDetailPage SHALL take `showWidgetActions` (manifest
`config.showWidgetActions`, default true) and pass it to the cards of the body
grid and the side column. A widget definition's `showActions` SHALL win when it
is a boolean. A data card without the menu SHALL render no Actions menu; a
catalog card that offers an Add action SHALL keep the menu that holds it.

#### Scenario: A side-column data card without the menu

- **GIVEN** `config.showWidgetActions: false` and a `data` widget in the side column
- **WHEN** the page renders
- **THEN** the card renders without its Actions menu

### Requirement: An empty field takes its separator with it

A column `secondary` template SHALL drop a field without a value together with
the separator in front of it, so `"{identifier} · {requester}"` with no
requester reads `2026-0002`, not `2026-0002 ·`. A template whose fields all
have values SHALL fill exactly as before.

#### Scenario: No requester

- **GIVEN** `secondary: "{identifier} · {requester}"` and a row without a requester
- **WHEN** the table renders
- **THEN** the second line reads `2026-0002`

### Requirement: Only the best-matching menu entry is active

When two visible menu entries share a route and differ in `query` or `params`,
CnAppNav SHALL render them as plain links routed in the app, so only
`isActive`, which marks the entry that matches best, decides which is active.
vue-router's own active check ignores the query and SHALL NOT light a second
entry. An entry with a route of its own SHALL stay a router link.

#### Scenario: The unfiltered case list

- **GIVEN** "All cases" (route Cases) and "Woo requests" (route Cases, query caseType) and the address `/cases`
- **WHEN** the navigation renders
- **THEN** only "All cases" is active

### Requirement: A long title keeps the header actions on its row

In a detail header that holds a widget (`headerWidget`), the title block SHALL
start from a zero basis, so a long title wraps (two lines, then an ellipsis)
beside the actions instead of pushing them onto the next row.

#### Scenario: A long case title

- **GIVEN** a header with a widget, a title longer than the row and three action buttons
- **WHEN** it renders in a browser at 1440px
- **THEN** the actions' top is above the title's bottom

### Requirement: An index page can take the board header

CnIndexPage SHALL take `showTitleIcon` (default true; false drops the icon
before the title), `showCount` (default true; false drops the actions bar's
"Showing 20 of 258" line) and `headerButtons` (default empty): buttons beside
the title with an `action` of `add`, `export`, `import`, `refresh` or a
`headerActions` id. When header buttons show (they need `showTitle`), the
actions bar SHALL drop its Views and Actions menus, and the Add button and
Export menu when a button takes their action. CnActionsBar SHALL take
`showCount` and `showActionsMenu` (both default true). Without the keys the
page SHALL render as before.

#### Scenario: Export and New case beside the title

- **GIVEN** `showTitle`, `headerButtons: [{ label: "Export", action: "export" }, { action: "add", variant: "primary" }]`
- **WHEN** the index page renders
- **THEN** the two buttons sit beside the title and the bar shows no Actions menu, no Views control and no Add button

### Requirement: The next-step kicker stays a kicker under a heading theme

The CnNextStepCard title SHALL keep its kicker size (0.85em) under a theme that
sizes every heading with `!important`. Without such a theme nothing SHALL
change.

#### Scenario: Under nldesign's h3 rule

- **GIVEN** the card in a 15px context under `h3 { font-size: 18px !important }`
- **WHEN** it renders in a browser
- **THEN** the title is about 12.75px, not 18px

### Requirement: The in-app capability comparison is deprecated

`capabilityComparison` on CnFeaturesAndRoadmapView and CnFeaturesAndRoadmapPage,
the `features_roadmap_capabilities` initial state key and CnCapabilityTable
SHALL be documented as deprecated in favour of publishing the comparison on
the app's docs site and linking to it. A development build SHALL warn once per
page load when a comparison is given. Nothing SHALL be removed and the
rendering SHALL NOT change.

#### Scenario: A comparison is passed

- **GIVEN** a development build and a view with `capabilityComparison`
- **WHEN** it mounts
- **THEN** one console warning names the deprecation, and a second component with a comparison adds none

### Requirement: A dashboard closes the gap a shrinking or hidden widget leaves

CnDashboardGrid SHALL move an item it already tracks when the layout gives it a
new `gridX` or `gridY` (the page re-compacts its display layout when a
widget's condition hides it). In a `sizeToContent` cell the content's first
child SHALL take its own height, so the cell can shrink to it. CnDashboardGrid
SHALL take `float` and CnDashboardPage `gridFloat` (manifest
`config.gridFloat`), both default true; false packs widgets upward.

#### Scenario: A hidden attention card

- **GIVEN** an attention card above the stat tiles whose `visibleWhen` turns false after the grid mounted
- **WHEN** the condition is evaluated
- **THEN** the stat tiles move up to the row the card had

#### Scenario: A short list in a size-to-content cell

- **GIVEN** a widget with `sizeToContent: true` whose list holds one row in a cell authored 6 rows tall
- **WHEN** it renders in a browser
- **THEN** the cell shrinks to the widget's own height

### Requirement: A list widget keeps a column's second line

CnObjectListWidget SHALL pass a column's `secondary` through to the table.

#### Scenario: Waiting for me

- **GIVEN** an object-list column `{ key: "title", secondary: "{customer} · {channel}" }`
- **WHEN** the widget renders
- **THEN** each row shows the second line

### Requirement: A stacked bar says it is empty with the designed empty state

CnStackedBarWidget SHALL show an empty total with the compact
CnWidgetEmptyState the list widgets use, carrying `emptyText`.

#### Scenario: No contact yet today

- **GIVEN** a stacked bar whose segments sum to 0
- **WHEN** it renders
- **THEN** a compact CnWidgetEmptyState reads the empty text

### Requirement: A stats block can take the stacked board look

CnStatsBlock SHALL take `layout: "stacked"`: the stat tile's stacked look
(no icon circle, a 14px muted title, the number at 34px/700, the unit on a
muted line under it). CnStatsBlockWidget SHALL pass it, and CnDashboardPage
SHALL read it from a stats-block definition's `props.layout` or
`content.layout`. Without it the KPI card SHALL render as before.

#### Scenario: decidiq's counters

- **GIVEN** a `stats-block` widget with `content.layout: "stacked"`
- **WHEN** the dashboard renders
- **THEN** the block carries `cn-kpi-card--stacked` and no icon circle

### Requirement: A greeting kicker can carry a prefix

CnHeaderWidget SHALL take `content.kicker` (an i18n key): the line above the
heading SHALL read the kicker, then " · ", then the date when `showDate` is on.
Without `kicker` the line SHALL be the date as before.

#### Scenario: Klantcontact

- **GIVEN** `content: { greeting: true, showDate: true, kicker: "Klantcontact" }`
- **WHEN** it renders on 5 October 2026
- **THEN** the line reads "Klantcontact · " followed by the date

### Requirement: A greeting can carry the emblem

CnHeaderWidget SHALL take `content.emblem`: a URL, or `true` for the theme's
`--nldesign-emblem-url`, drawn 52px high (`--cn-header-emblem-size`) beside the
date line and heading and centred on them, as LpStart draws it. Without the
key nothing changes.

#### Scenario: LpStart's emblem

- **GIVEN** `content: { greeting: true, showDate: true, emblem: true }`
- **WHEN** it renders
- **THEN** an emblem element precedes the date line and heading on one row

### Requirement: An agenda placement can drop the calendar chrome

CnCalendarWidget SHALL take `content.showTitle: false` (no "Calendar"
sub-heading) and `content.showViewModes: false` (no Month / Week / Agenda
buttons); without both the header row SHALL NOT render. A dashboard widget
placement or definition with `showButtons: false` SHALL render without its
footer links ("More events"). Without the keys nothing changes.

#### Scenario: Agenda today

- **GIVEN** a calendar widget with `showTitle: false` and `showViewModes: false`
- **WHEN** it renders
- **THEN** no header row renders above the agenda

### Requirement: A stat tile can carry a second caption line

CnStatWidget SHALL take `content.note` (an i18n key) and `content.noteVariant`
(the `captionVariant` names): a second caption line under the caption, as
LpStart's "3 deadlines this week". The line is static text; a second count
source is out of scope. Without the key nothing changes.

#### Scenario: A note under the count

- **GIVEN** a stat tile with `note: "3 deadlines this week"` and `noteVariant: "danger"`
- **WHEN** it renders
- **THEN** the line shows under the caption in the error colour
