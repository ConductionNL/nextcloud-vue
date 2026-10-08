# index-list-board-look Delta: screens-index-list-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-index-list-parity](../../)

## Purpose

The index list as the screens draw it (the DqZaken setup), under the board
look. Without the look every part renders as before.

## ADDED Requirements

### Requirement: The index header reads title, count and the board buttons

Under the board look `CnIndexPage` SHALL render its header as two rows with
6px between them: row 1 an h1 of 28px, weight 700, line height 1.2, and the
header buttons at its end; row 2 the count line at 15px in
`--color-text-maxcontrast`, built from `config.countText` (a template with
`{shown}`, `{total}` and free text, default `"{shown} of {total}"`). The
header SHALL render no icon. `config.headerButtons` SHALL accept the button
kind `actions-menu`, which renders the page's header actions as one labelled
secondary menu button ("Actions") and renders nothing when the page has no
header actions. The header buttons SHALL render in this order whatever order
the manifest declares: `export` (labelled "Download", with its icon),
`actions-menu`, any other secondary button, the buildiq square, then the
primary button.

#### Scenario: The DqZaken header

- **GIVEN** `headerButtons: [{ action: "add", variant: "primary", label: "New case" }, { action: "export" }, { action: "actions-menu" }]`, two header actions and `countText: "{shown} of {total} open cases in your teams"`
- **WHEN** the page renders under the board look
- **THEN** row 1 reads "All cases", Download, Actions, the buildiq square, New case, and row 2 reads "8 of 48 open cases in your teams"

#### Scenario: No header actions

- **GIVEN** `actions-menu` declared and no header actions
- **WHEN** the page renders
- **THEN** no Actions button renders

@e2e include Assert the header button order and the count line against dossiq/DqZaken.

### Requirement: The toolbar sits on the ground in two rows

Under the board look `CnActionsBar` SHALL draw no background, padding or
radius and SHALL lay out two rows, 20px below the header and 20px above what
follows. Row 1, 8px gaps: the saved-view chips, a flexible spacer, the
"Save view" button (34px, radius 17px, 13px weight 600, background
`--color-primary-element-light`, text `--color-primary-element-light-text`)
when saved views are on, the Filter button, then the view switch. The Filter
button SHALL be a labelled secondary button 36px high, radius 8px, that opens
the facet sidebar (it replaces the icon-only "Search and columns" toggle) and
carries the number of active filters as a 20px badge filled
`--color-primary-element` with white 12px text, absent at zero. Row 2, 8px
gaps, 14px: the search field (40px high, radius 8px, not a pill, 1px
`--color-border-dark`, padding 0 12px 0 38px, `flex: 1 1 260px`, at most
360px), then, when filters are active, the muted label "Active:", one chip per
active filter (30px, radius 15px, padding 0 6px 0 12px, weight 600, on
`--color-primary-element-light` with `--color-primary-element-light-text`,
and a 22px round remove button named "Remove filter: <label>"), then a
"Clear all" link. Row 2 SHALL always render, so the search field is drawn on
a list with no active filter.

#### Scenario: Two active filters

- **GIVEN** a list under the board look with filters team and status active
- **WHEN** it renders in a browser
- **THEN** the Filter button shows 2, row 2 shows the search field, "Active:", two chips with remove buttons and "Clear all", and the toolbar has no background

#### Scenario: No active filter

- **GIVEN** the same list with no filter
- **WHEN** it renders
- **THEN** row 2 still shows the search field, the Filter button shows no badge, and there is no "Active:" label

@e2e include Measure both toolbar rows and the Filter badge against dossiq/DqZaken.

### Requirement: Saved views are chips with a count

Under the board look the saved views (and the quick filter tabs of
`CnQuickFilterBar`) SHALL render as a row of chips on the ground, not as a
menu: each chip a button 38px high, padding 0 14px, radius 19px, 14px weight
600, gap 8px before its count badge, with `aria-pressed`. An idle chip SHALL be
`--color-main-background` with a 1px `--color-border-dark` border; the
selected chip SHALL be filled `--color-main-text` with
`--color-main-background` text and no border. The count badge SHALL be padding
1px 7px, radius 10px, 12px: on an idle chip `--color-border` with
`--cn-board-text-soft`, on the selected chip `--cn-board-text-soft` with
white. A view without a count SHALL show no badge. Managing views (rename,
share, delete) SHALL stay in the existing saved-views menu, reached from the
"Save view" button's menu.

#### Scenario: Six views, one selected

- **GIVEN** six saved views with counts 48, 14, 3, 4, 19 and 15 and "All" selected
- **WHEN** the toolbar renders under the board look
- **THEN** six 38px chips render, "All" filled dark with a 48 badge, the other five outlined with grey badges

@e2e include Assert chip height, the pressed state and the badge colours against dossiq/DqZaken.

### Requirement: The view switch is four icon segments in a fixed order

Under the board look the view switch SHALL render as a group (named "View")
on a track with padding 3px, radius 8px, gap 2px, background
`--color-background-dark`. Each segment SHALL be an icon-only button 40px by
34px, radius 6px, with its label as its accessible name and `aria-pressed`;
the active segment SHALL be `--color-main-background` with a 0 1px 2px
shadow, the others transparent in `--cn-board-text-soft`. There SHALL be no
sliding thumb. The segments SHALL appear in the order table, cards, board,
map, each one only when the page offers that mode.

#### Scenario: All four modes

- **GIVEN** a page that offers table, cards, board and map, with table active
- **WHEN** the switch renders under the board look
- **THEN** four 40px by 34px icon buttons render in that order and only the table segment is pressed

#### Scenario: A page without a map

- **GIVEN** a page that offers table, cards and board
- **WHEN** the switch renders
- **THEN** three segments render in the order table, cards, board

### Requirement: The bulk band is its own row

Under the board look the selection strip SHALL render outside the toolbar, as
its own row between the toolbar and the table card, and only while rows are
selected. It SHALL be a region named "Actions for the selection", padding 10px
14px, radius 10px, 8px gaps, 14px, background `--color-primary-element-light`,
text `--color-primary-element-light-text`. It SHALL start with a bold lead
("With the selected <plural>", the plural from the schema's title, default
"items"), then the bulk actions as secondary buttons 34px high, padding 0
12px, radius 8px, then an optional 13px hint (`config.bulkHint`). The
selection count SHALL stay announced through the existing live region.

#### Scenario: Three rows selected

- **GIVEN** three selected cases and five bulk actions under the board look
- **WHEN** the page renders in a browser
- **THEN** the band sits between the toolbar and the table, reads "With the selected cases", and shows five 34px buttons

@e2e include Select rows and assert the band's position between toolbar and card against pipelinq/PqTicketsSelectie.

### Requirement: The table is a white card with one row menu

Under the board look the table container SHALL be `--color-main-background`
with a 1px `--color-border` border, radius 12px, no shadow and no bottom
margin, clipping its content. Header cells SHALL be padding 12px 16px, weight
600, `--color-text-maxcontrast`, on `--color-background-hover`. Body cells
SHALL be padding 14px 16px at 14px, each row separated by a 1px
`--cn-board-hairline` top rule and no bottom rule. The selection column SHALL
be 28px wide with 18px checkboxes in `--color-primary-element`. The title
column SHALL render the title as a 15px weight 600 link in
`--color-main-text` with the column's `secondary` line under it in
`--color-text-maxcontrast`. A status column SHALL render a pill: padding 3px
10px, radius 12px, 13px weight 600, colours from the status colour map. The
last column, headed by a visually hidden "Actions", SHALL hold one 34px
square secondary button per row that opens the row's action menu and is named
"Actions for <title>"; under the board look the row SHALL show no hover icons
and no inline text buttons.

#### Scenario: A row of the case list

- **GIVEN** a case list under the board look with title, type, status, assignee and deadline columns
- **WHEN** it renders in a browser
- **THEN** the card has radius 12px and no shadow, the header row is 600 weight on the hover ground, and each row ends in one 34px menu button

@e2e include Measure cell padding, the card radius and the row menu button against dossiq/DqZaken.

### Requirement: The footer sits inside the card

Under the board look `CnIndexPage` SHALL render the pagination as the table
card's footer (and under the card grid in the cards view): a 1px
`--cn-board-hairline` top rule, padding 12px 16px, 14px in
`--color-text-maxcontrast`, the count text at the start and the page numbers
at the end. `CnPagination` SHALL accept `variant: "board"` for this: the
count text reads `"{shown} of {total}"` plus the page's `config.footerNote`
when set; the page links are 34px squares, radius 8px, the current one
filled `--color-primary-element` with white weight 600 text, the others with
a 1px `--color-border` border; a labelled "Previous" before the numbers on
any page after the first and a labelled "Next" after them on any page before
the last. The board variant SHALL render no First, no Last, no page-size
select and no "Show more". The default variant SHALL render as before.

#### Scenario: Page one of three

- **GIVEN** 48 items, 20 per page, page 1, under the board look
- **WHEN** the footer renders
- **THEN** it reads "20 of 48" at the start and 1, 2, 3, Next at the end, inside the card, with 1 filled

#### Scenario: The default variant

- **GIVEN** the same list without the board look
- **WHEN** the footer renders
- **THEN** it shows First, Previous, the numbers, Next, Last and the page-size select, as before

@e2e include Assert the footer is a child of the table card and the absence of First, Last and the page-size select.
