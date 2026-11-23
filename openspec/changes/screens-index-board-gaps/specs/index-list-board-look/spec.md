# index-list-board-look Delta: screens-index-board-gaps

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-index-board-gaps](../../)

## Purpose

The index page's header buttons, view switch and rows as the list boards draw
them, without each manifest having to say so.

## ADDED Requirements

### Requirement: The Download button carries its icon

Under the board look an `export` header button SHALL carry the Download icon
unless the manifest names one, whether or not the manifest gives it a label.
Without a label it SHALL read "Download". Under the Nextcloud look the
declared icon SHALL be used as before.

#### Scenario: PqContacten with a labelled export button

- **GIVEN** `headerButtons: [{ "action": "export", "label": "Download" }]`
- **WHEN** the header renders under the board look
- **THEN** the button reads "Download" with the download icon

### Requirement: The view switch draws four segments by default

Under the board look, when the page sets no `viewSwitch`, the view switch
SHALL draw the four board segments (table, cards, board, map) as if
`viewSwitch: ["table", "cards", "board", "map"]` were set: a mode the page
cannot open is drawn disabled. A `viewSwitch` the manifest names SHALL win.
Without the board look the switch SHALL draw the offered modes only.

#### Scenario: PqContacten without board or map config

- **GIVEN** a contacts page with no `viewSwitch`, no board config and no `mapConfig`
- **WHEN** the switch renders under the board look
- **THEN** four segments render, board and map disabled

### Requirement: Unread rows are marked only where the reader asked for them

CnDataTable SHALL take `showUnread` (default true); off, a row with
`@self.unread` SHALL render like any other row, without bold and without the
unread dot. Under the board look an index page SHALL pass it on only when its
`personalLenses` include `unread`; under the Nextcloud look it SHALL always
pass it on.

#### Scenario: PqContacten for a new reader

- **GIVEN** contacts the reader never opened (`@self.unread: true`) on a board-look page without the Unread lens
- **WHEN** the table renders
- **THEN** no row is bold and no unread dot is drawn

### Requirement: A single page still draws its pager

Under the board look the table footer SHALL draw the page links on a single
page too: the current "1" and an inert "Next" (`aria-disabled`, no page
change), as the boards draw it. With more pages the footer SHALL read as
before.

#### Scenario: Eighteen contacts

- **GIVEN** a board-look list with 18 records on one page
- **WHEN** the footer renders
- **THEN** it reads "18 of 18" at the start and "1", "Next" (inert) at the end

### Requirement: No sidebar toggle on the primary button

Under the board look Nextcloud's own sidebar toggle (`.app-sidebar__toggle`)
SHALL NOT be drawn on a page that holds an index page: it sits over the
content's top-right corner, which is the primary header button. The Filter
button opens the sidebar.

#### Scenario: PqContacten with a sidebar

- **GIVEN** a board-look contacts page with a closed sidebar
- **WHEN** the header renders
- **THEN** no dark square sits on "New contact"

### Requirement: The header funnel has the board's size

Under the board look a column header's filter button SHALL be 22px square and
sit 4px after the sort chevron, with its 14px muted icon.

#### Scenario: PqContacten with header filters on

- **GIVEN** a board-look table with header filters
- **WHEN** a header renders
- **THEN** the funnel is a 22px button 4px after the chevron

### Requirement: The address opens a view mode that arrives later

An index page SHALL open the mode `?_view=` names, the map included, when the
page offers it. When the page offers that mode only later (the map, once rows
with a geometry are in), it SHALL open then, unless the reader picked a view
first.

#### Scenario: DqZakenKaart

- **GIVEN** `/cases?_view=map` on a page whose map segment appears after the rows load
- **WHEN** the map segment appears
- **THEN** the page shows the map

### Requirement: A column can carry the row link

CnDataTable SHALL take `link: true` on a column: that column, not the first,
names the row. It carries the row link, the title look and the unread, lock
and indicator marks. Without the flag the first column does, as before.

#### Scenario: DqTeamwachtrij

- **GIVEN** columns waiting time, then case title with `link: true`
- **WHEN** the table renders
- **THEN** the case title is the row's link and title, the waiting time an ordinary cell

### Requirement: A named source counts its quick filters

A named source (`entitySource`) MAY offer `count(config)`. A quick-filter tab
with `showCount` on such a page SHALL show the number it answers for the tab's
filter over `sourceConfig`. The `tasks` source SHALL count through the inbox
endpoint's total. A source without `count` shows no numbers.

#### Scenario: DqTaken

- **GIVEN** `entitySource: "tasks"` and tabs with `showCount: true`
- **WHEN** the page renders
- **THEN** each tab shows its inbox total

### Requirement: The table header row is near-white

Under the board look the table's header row SHALL draw on a near-white ground
(the boards' #fafbfc), themeable through `--cn-board-table-head-bg`, not on
the hover grey.

#### Scenario: Any list board

- **GIVEN** a board-look table
- **WHEN** it renders
- **THEN** its header row is near-white
