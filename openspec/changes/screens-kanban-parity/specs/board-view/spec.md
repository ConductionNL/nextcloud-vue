# board-view Delta: screens-kanban-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-kanban-parity](../../)

## Purpose

Let CnBoardView draw the board of the screens (canon section 8) when the
app takes the board look, without touching the move contract of
`status-board-and-date-axis` and `board-card-role-and-keyboard`.

## ADDED Requirements

### Requirement: The board column grid

In the board look CnBoardView SHALL lay its columns out as a CSS grid with
one track per column of `minmax(240px, 1fr)` and a 16px gap, inside a
container that scrolls horizontally when the tracks do not fit. A column
SHALL have `--color-background-dark` ground, radius 12px, 12px padding and a
12px gap between its header and cards, aligned to the top. Without the
board look the columns SHALL keep the fixed 260px width.

#### Scenario: Four columns share a wide screen

- **GIVEN** a board look board with four columns in a 1184px wide content area
- **WHEN** it renders
- **THEN** each column is 284px wide and there is no horizontal scroll

#### Scenario: Six columns scroll

- **GIVEN** six columns in the same area
- **WHEN** it renders
- **THEN** each column is 240px wide and the board scrolls sideways

### Requirement: The board column header

In the board look a column header SHALL be an `h2`-level heading of
15px/700 holding a 10px round dot, the column label and, pushed to the end,
a count badge (`--color-main-background`, radius 10px, padding 1px 8px,
12px text) that shows the column's total. The dot's colour SHALL come from
`config.board.colorField` on the column's state, else the lifecycle state's
declared colour, else the secondary text colour. With
`config.board.sumField` set a 13px grey line under the heading SHALL show the
column's sum of that field, formatted as the field's format declares.

#### Scenario: Count as a badge

- **GIVEN** a board look column "In progress" with 19 cards
- **WHEN** it renders
- **THEN** the heading shows a dot, "In progress" and a badge reading 19 at its right end

#### Scenario: A sum under the title

- **GIVEN** `sumField: "amount"` with three cards of EUR 100
- **WHEN** the column renders
- **THEN** a line under the heading reads "EUR 300,00"

### Requirement: The board card anatomy

In the board look a card SHALL be white, radius 10px, padding 14px, a 1px
`--color-border` border and an 8px gap, and SHALL render from
`config.board.card`: the title (15px/700, line height 1.3) as the link that
opens the card, the sub line (13px, `--color-text-maxcontrast`, its fields
joined by a middle dot), the pill (a status pill in the field's colour),
and a footer above a 1px hairline with 8px top padding holding the due date
left (13px; 600 in the warning text colour when soon, 700 in the error text
colour when late) and the owner as a 26px avatar right. A late card SHALL
add a 3px inset edge in `--color-error`. When `card` is missing the first of
`cardFields` SHALL be the title and the rest the sub line. A role whose
value is empty SHALL render nothing, and its separator SHALL go with it.

#### Scenario: The DqWerkbord card

- **GIVEN** `card: { title: "title", sub: ["identifier", "requester"], pill: "type", due: "deadline", owner: "assignee" }` and a case due today
- **WHEN** the card renders
- **THEN** it shows the title link, "2026-0061 · M. de Graaf", the type pill, "Due today" in the error colour with a red edge, and the owner's initials

### Requirement: The card shows no form controls at rest

In the board look a card SHALL NOT render the "Open" text button or the
"Move to" select. It SHALL render a 34px menu button at its top right whose
menu holds "Move to" with one item per other column, and the same menu
SHALL open on the M key while the card or a control inside it has focus.
Choosing a column SHALL run the identical transition call the drag runs.
The card SHALL stay a `listitem` container and SHALL NOT take
`role="button"`. Without the board look the select and the Open button
SHALL render as before.

#### Scenario: Moving with the keyboard

- **GIVEN** a board look card focused in column "Received"
- **WHEN** the user presses M and picks "Decision"
- **THEN** the host's transition runs once with the card and the target "Decision", as a drop would

#### Scenario: No nested controls

- **GIVEN** a board look board
- **WHEN** axe runs on it
- **THEN** it reports no nested-interactive or aria-required-children violation

### Requirement: A long column is cut with a show-more button

CnBoardView SHALL read `config.board.columnLimit` (default none). When a
column holds more cards than the limit it SHALL draw the first `limit`
cards and a full-width 34px button with a 1px dashed `--color-border-dark`
border and 13px/600 text reading "Show N more", N being the hidden count.
Pressing it SHALL reveal the rest of that column only. With `paged` true it
SHALL load the column's next page instead. The count badge SHALL keep
showing the column's total.

#### Scenario: Four of nineteen

- **GIVEN** `columnLimit: 4` and a column of 19 cards
- **WHEN** it renders
- **THEN** four cards and a dashed "Show 15 more" button render, and the badge reads 19
