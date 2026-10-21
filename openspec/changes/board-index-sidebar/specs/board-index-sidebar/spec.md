# board-index-sidebar

## ADDED Requirements

### Requirement: The board index sidebar draws the board's side panel

In the board look the sidebar of an index page SHALL be 360px wide, SHALL set the line under its title at 14px in
the muted ink, and SHALL round its close button. Its title and its tab row are drawn by `board-index-sidebar-tabs`.

#### Scenario: DqFilterBeheren side panel

- **GIVEN** the Cases index page of a board-look app with the sidebar open
- **THEN** the sidebar is 360px wide
- **AND** the line under the title is 14px in the muted ink
- **AND** the close button is round

### Requirement: The pressed Filter button is the board's light toggle

In the board look the Filter button that opens the index sidebar SHALL, while the sidebar is open, draw the light
primary ground with a primary edge and the main ink instead of a filled primary button.

#### Scenario: DqFilterBeheren Filter

- **GIVEN** the Cases index page of a board-look app with the sidebar open
- **THEN** "Filter" sits on the light primary ground with a primary edge and its count in the filled primary pill
