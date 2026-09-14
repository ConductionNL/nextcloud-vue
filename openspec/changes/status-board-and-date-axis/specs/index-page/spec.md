# index-page Delta: status-board-and-date-axis

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [status-board-and-date-axis](../../)

## Purpose

`CnIndexPage` gains a board bound to the status field, a second axis over
it, and a date axis where overlapping work is visible. Round 4 discovery
cluster 3, candidates C-tasks-and-phases-21, C-search-37, C-search-26,
C-search-44 and C-reporting-27, under decision D5. Consumed by dossiq on
`#Cases`, replacing `WorkflowBoard.vue`.

## ADDED Requirements

### Requirement: The index page offers a board bound to the status field

`CnIndexPage` SHALL accept `board` as a `viewMode` value, offered only
when `config.viewModes` lists it. The board SHALL take its columns from
the field named by `config.board.statusField`, using that field's enum
values or its declared lifecycle states, in the order the schema
declares. A status the schema hides SHALL NOT be a column. A page whose
`board.statusField` names a field carrying neither an enum nor a
lifecycle SHALL fail manifest validation, naming the page. Each column
SHALL page its cards and SHALL label a count it cannot confirm as the
loaded count. The default `viewMode` SHALL remain `table`, and a page
listing neither new mode SHALL behave exactly as before.

#### Scenario: The board renders the stages the schema declares

- **GIVEN** a case schema whose `status` field declares five lifecycle states in order
- **WHEN** a user switches the case list to the board
- **THEN** five columns render in that order, each holding the cases in that state

#### Scenario: A hidden status is not a column

- **GIVEN** a status the schema marks hidden
- **WHEN** the board renders
- **THEN** no column exists for it

#### Scenario: A field that cannot carry a board is refused at build time

- **GIVEN** a page declaring `board.statusField` pointing at a free-text field
- **WHEN** the manifest is validated
- **THEN** validation fails and the message names the page and the field

@e2e exclude manifest validation is a build-time check; covered by the manifest unit tests.

### Requirement: Moving a card runs a transition and a refusal is shown

Dropping a card in another column SHALL ask the host to run the
transition from the card's current status to that column's status.
`CnBoardView` SHALL NOT write the status field directly. A refused
transition SHALL return the card to its column and SHALL render the
refusal message the host returned. A card whose status changed since the
board loaded SHALL be re-read and the move SHALL NOT be forced. Every
column SHALL be reachable from the card menu as Move to, running the same
transition.

#### Scenario: A drag advances a case

- **GIVEN** a case in "in behandeling" on a board
- **WHEN** a handler drags it to "afgehandeld" and the transition is allowed
- **THEN** the card sits in "afgehandeld" and the case records the transition

#### Scenario: A guard refuses, and says why

- **GIVEN** a case whose case type refuses a decision before the advice is filed
- **WHEN** a handler drags it to "besluit genomen"
- **THEN** the card returns to its column and the guard's own message is shown

#### Scenario: The keyboard does what the mouse does

- **GIVEN** a handler operating the board from the keyboard
- **WHEN** they open a card menu and choose Move to "afgehandeld"
- **THEN** the same transition runs and the same refusal path applies

#### Scenario: Somebody else moved it first

- **GIVEN** a board loaded before a colleague advanced the same case
- **WHEN** the handler drops the card in a third column
- **THEN** the row is re-read, the move is not forced, and the board shows the case where it now is

### Requirement: A board groups into rows by a second field

`config.board.swimlaneField` SHALL group the cards into rows while the
columns remain the stages. With no `swimlaneField` the board SHALL render
one row and no row headers. A card with no value for the field SHALL land
in one named row and SHALL NOT be dropped. A row SHALL collapse, and
SHALL stay collapsed while the user remains on the view.

#### Scenario: A board split by afdeling

- **GIVEN** a board with `swimlaneField` set to `afdeling` and three afdelingen in the result
- **WHEN** the board renders
- **THEN** three rows render, each with the same stage columns

#### Scenario: Work with no afdeling is still visible

- **GIVEN** four cases with no afdeling
- **WHEN** the board renders
- **THEN** they appear in one named row rather than disappearing

### Requirement: The date axis shows overlapping work and hides nothing

`CnIndexPage` SHALL accept `dateAxis` as a `viewMode` value, offered only
when `config.viewModes` lists it. Rows carrying both
`config.dateAxis.startField` and `endField` SHALL render on a time scale,
one lane per `laneField` value, so overlaps are visible. Rows missing
either date SHALL render in a visible unplanned lane. The view SHALL NOT
reschedule anything. Every bar SHALL carry an accessible name and the
view SHALL be operable from the keyboard.

#### Scenario: Two hearings in one week, on one handler

- **GIVEN** two cases with overlapping start and end dates on the same handler
- **WHEN** the date axis renders with `laneField` set to the handler
- **THEN** both bars render in that handler's lane and the overlap is visible

#### Scenario: An undated case is not lost

- **GIVEN** a case with a start date and no end date
- **WHEN** the date axis renders
- **THEN** it appears in the unplanned lane, named

#### Scenario: Nothing is rescheduled from the view

- **GIVEN** a user on the date axis
- **WHEN** they drag a bar
- **THEN** nothing moves and no date is written

### Requirement: Each view mode keeps its own filter

A filter a user sets while on one view mode SHALL NOT follow them to
another view mode of the same view. The view's own criteria SHALL apply
to every mode. Switching modes SHALL keep the view route in the address
bar.

#### Scenario: The board filter stays on the board

- **GIVEN** a user who filters the board to one afdeling
- **WHEN** they switch to the table
- **THEN** the table shows the view's rows unfiltered by the afdeling they picked

#### Scenario: The view's criteria apply everywhere

- **GIVEN** a view whose criteria are "open cases in my team"
- **WHEN** the user switches between table, board and date axis
- **THEN** every mode shows only open cases in their team
