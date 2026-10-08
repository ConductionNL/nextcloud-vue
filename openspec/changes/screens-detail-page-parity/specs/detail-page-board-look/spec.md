# detail-page-board-look Delta: screens-detail-page-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-detail-page-parity](../../)

## Purpose

The detail page as the screens draw it, under the board look. Without the
look every part renders as before.

## ADDED Requirements

### Requirement: The detail header is two rows on the ground

Under the board look `CnDetailPage` SHALL render its header without card,
icon, avatar or type eyebrow, as row 1 and row 2 with 6px between them, and
22px between the header and the next block. Row 1 SHALL hold the title as an
h1 of 28px, weight 700, line height 1.2 (`flex: 1 1 320px`), and the header
buttons at its end. Row 2 SHALL hold, 8px apart, at 14px: the header pills
(`typePill`, `statusPill`; padding 3px 10px, radius 12px, 13px weight 600),
the breadcrumb (`CnBreadcrumbs` in `--color-text-maxcontrast`, separator
`"/"` unless the manifest sets one), a middle dot, and the meta line built
from `config.headerMeta` (a field template such as `"via {channel}"`) and the
header field chips of `detail-header-field-chips` when declared. The
breadcrumb SHALL NOT render above the header under the board look.

#### Scenario: The DqZaak header

- **GIVEN** a case with type pill "Woo request", status pill "In progress", `breadcrumb: { label: "All cases", currentField: "identifier" }` and `headerMeta: "via {channel}"`
- **WHEN** the page renders under the board look
- **THEN** row 1 is an h1 of 28px with the buttons at its end, and row 2 reads the two pills, "All cases / 2026-0082", a middle dot and "via Mijn Zuiddrecht"

#### Scenario: Without meta

- **GIVEN** no `headerMeta` and no header fields
- **WHEN** the page renders
- **THEN** row 2 ends after the breadcrumb and renders no middle dot

@e2e include Assert the two header rows and the absence of a breadcrumb above the header against dossiq/DqZaak.

### Requirement: The detail header buttons follow one order

Under the board look the header buttons SHALL render, whatever the manifest
order: the quick actions (secondary, at most three), Edit (secondary,
labelled), the buildiq square, then the menu labelled "More" (secondary,
icon and label, never icon-only) holding the grouped actions, Delete last.
The header SHALL render no primary button when the page shows a next-step
card, and otherwise only when the manifest names a main action.

#### Scenario: A case with three quick actions

- **GIVEN** quick actions Message, Document and Log contact, edit allowed, a next-step card
- **WHEN** the header renders under the board look
- **THEN** it reads Message, Document, Log contact, Edit, the buildiq square, More, and no primary button

### Requirement: Folder tabs take the board strip

Under the board look `CnTabs` (line variant) SHALL render each tab at least
34px high, padding 8px 12px, radius 8px 8px 0 0, 1px `--color-border-dark`
border without a bottom edge, 4px apart, at 14px weight 400 on
`--color-background-dark`. The active tab SHALL be `--color-main-background`
with a bottom edge in the same colour and weight 700, and SHALL NOT draw a
primary top edge. A tab SHALL render no icon. A tab count SHALL follow the
label, 8px after it, as a badge at least 20px wide and 20px high, padding 0
6px, radius 10px, 12px weight 600, `--color-border` with
`--cn-board-text-soft`, and no border. The strip SHALL end with a labelled
secondary "Actions" button, 34px high, aligned to the top of the strip
(`#nav-end`), and SHALL render no overflow tab named "More". The tab list
SHALL be named by `config.tabsLabel`, default "<type> parts". The first card
of the active panel SHALL join the strip: no top border, radius 0 12px 12px
12px.

#### Scenario: Five tabs with counts

- **GIVEN** tabs Overview, Documents (7), Contact (4), Tasks (4), History (10) under the board look, Overview active
- **WHEN** the strip renders in a browser
- **THEN** each count is a grey 20px badge without a border, Overview is white and bold with no coloured top edge, and Actions sits at the end of the strip

@e2e include Measure tab height, the badge and the joined first card against dossiq/DqZaak and werkplek/Tabs.

### Requirement: The tabs and their panel take the body column

Under the board look, on a page with a side column, the tab strip and its
panel SHALL render inside the body column, and the side column SHALL start
level with the top of the tab strip. The body column SHALL take
`flex: 999 1 520px` and the side column `flex: 1 1 300px`, 20px apart; the
side column SHALL drop under the body when the page is narrower than both.

#### Scenario: Side column beside the tabs

- **GIVEN** a case with tabs and a side column at 1440px under the board look
- **WHEN** it renders in a browser
- **THEN** the top of the first side card is level with the top of the tab strip, and the strip ends where the body column ends

@e2e include Compare the top of the strip with the top of the first side card.

### Requirement: History is the last tab

Under the board look, when a detail page shows the record's activity
(`CnActivityTab`, the audit trail widget or the timeline widget) as a tab,
that tab SHALL be named "History" and SHALL render last, whatever its
position in the manifest, and the activity SHALL NOT also render as a body
section. Its panel SHALL hold: a header row with an h2 of 17px weight 700, a
14px muted subtitle, and the Add note and Export buttons (secondary, 40px) at
its end; a row of kind chips (36px, padding 0 12px, radius 18px, 14px weight
600, the selected one filled `--color-main-text`, each with its count badge
as in the saved-view chips of `screens-index-list-parity`) followed by the
visibility select (36px, radius 8px); and the events as a rail. Each event
SHALL have a 34px round icon on a tint of its kind, a 2px `--color-border`
connector to the next event, a 15px line with the verb in weight 600, and a
13px muted meta line "<kind> · <who> · <when>".

#### Scenario: History declared second

- **GIVEN** a manifest that lists the activity tab second of five
- **WHEN** the page renders under the board look
- **THEN** the strip shows History as the fifth tab, and the overview has no activity section

#### Scenario: The History panel

- **GIVEN** ten events of five kinds
- **WHEN** the History tab is opened
- **THEN** the chip row reads All 10 and one chip per kind with its count, and every event has a 34px icon and a meta line

@e2e include Open the History tab and compare chips, rail and meta line with dossiq/DqZaakHistorie.

### Requirement: The next-step card takes the board anatomy

Under the board look `CnNextStepCard` SHALL have radius 12px, padding 20px
24px 20px 28px with its 4px inset primary bar, and 16px 32px between its two
parts. The kicker SHALL be 13px, weight 700, letter-spacing 0.06em,
uppercase, in `--color-primary-element-light-text`. The checklist SHALL be
15px with 8px between items. A done marker SHALL be a 20px circle on
`--color-success-light` (board `#e7f3ea`) with a check in
`--color-success-text`, not a primary fill; the current marker a 2px
`--color-primary-element` ring; an open marker a 2px `--color-border-dark`
ring. The action SHALL be a primary button 44px high, padding 0 20px, 15px
weight 600, with the `after` line under it at 13px in
`--color-text-maxcontrast`.

#### Scenario: Step two of five

- **GIVEN** a next-step card with one done item, one current item and one open item
- **WHEN** it renders under the board look
- **THEN** the done marker is green-tinted, the current marker a primary ring, and the button is 44px high

### Requirement: Body and side cards take the board anatomy

Under the board look a body card SHALL be `--color-main-background` with a 1px
`--color-border` border, radius 12px, padding 20px 22px, an h2 of 17px weight
700, and 12px to 14px between its parts. A data card SHALL list its fields in
a grid of `repeat(auto-fit, minmax(200px, 1fr))` with a 12px 24px gap at
15px, each field a 13px muted label over a weight 500 value with a 1px
`--cn-board-hairline` rule and 10px under it. A side card SHALL use the same
box with 10px to 12px between its parts, a heading of 15px weight 600 in
`--color-text-maxcontrast` (a label, not a title), facts as a two-column list
(`max-content 1fr`, gap 8px 16px, 14px), and no Actions menu
(`showWidgetActions` false by default under the look). A notice card at the
top of the side column SHALL have radius 12px, padding 14px 16px, 14px, on
the warning tint. The side column SHALL end with a History card whose last
line names the record's identifier (`config.identifierField`).

#### Scenario: The case side column

- **GIVEN** a side column with a notice, Deadline, Requester, Handling, Linked and History cards
- **WHEN** it renders under the board look
- **THEN** the notice is first on the warning tint, every other card has a 15px muted heading and no Actions menu, and the History card ends with the line naming 2026-0082

@e2e include Measure body and side card padding, radius and heading sizes against dossiq/DqZaak.
