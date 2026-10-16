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
