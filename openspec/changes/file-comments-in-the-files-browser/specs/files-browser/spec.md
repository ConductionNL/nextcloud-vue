## ADDED Requirements

### Requirement: The files browser shows the comments Nextcloud stores on a file

`CnFilesBrowser` SHALL offer a Comments action on every file row when the
host asks for it, opening the comments Nextcloud already stores against
that file over its comments DAV endpoint. The panel SHALL list each comment
with its author, its moment and its text, newest first, and SHALL let the
reader add one. The library SHALL store no comment of its own: the platform
owns them, and a second store is a second answer.

#### Scenario: A reader adds a comment without leaving the page

- **GIVEN** a files browser with comments asked for, on a folder holding one file
- **WHEN** the reader opens Comments on that row and posts a sentence
- **THEN** the comment SHALL be stored against that file
- **AND** it SHALL appear in the Files app's own sidebar for the same file

#### Scenario: A row says how many comments a file carries

- **GIVEN** a file with three comments and a file with none
- **WHEN** the folder renders
- **THEN** the first row SHALL show three
- **AND** the second row SHALL show no count at all

### Requirement: An instance without comments offers no comments action

`CnFilesBrowser` SHALL ask once whether the comments endpoint answers, and
SHALL hide the action when it does not. It SHALL NOT offer an action that
fails on click, and SHALL NOT ask again per row.

#### Scenario: The Comments app is disabled
@e2e exclude a server configuration branch; covered by the fileComments unit test with a 404 client

- **GIVEN** an instance whose comments endpoint answers 404
- **WHEN** a folder of five files renders
- **THEN** no row SHALL offer Comments
- **AND** the endpoint SHALL have been asked once, not five times

### Requirement: A failed comment read is not an empty one

A comments panel whose read failed SHALL draw the error and a retry. It
SHALL NOT render the empty state, because a file with nothing said about it
and a service nobody can reach look identical otherwise, and only one of
them means somebody's note is invisible.

#### Scenario: An unreachable comments service shows the error
@e2e exclude a transport failure with no reachable gesture; covered by the CnFileComments unit test with a rejecting client

- **GIVEN** the comments read rejects
- **WHEN** the panel renders
- **THEN** it SHALL show the error and a retry
- **AND** it SHALL NOT show the empty state

### Requirement: Comments are off unless the host asks

The `comments` prop SHALL default to false, and a browser without it SHALL
render exactly what it renders today. The manifest v2 `files` widget config
SHALL accept `comments` as an optional key and SHALL reject nothing it
accepted before.

#### Scenario: An existing host is unchanged on upgrade
@e2e exclude a default-value check over the component contract; covered by the browser unit test

- **GIVEN** a host that passes no `comments` prop
- **WHEN** the browser renders a folder
- **THEN** no row SHALL offer Comments
- **AND** no comments endpoint SHALL be called
