# board-view Delta: board-loads-every-row

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-loads-every-row](../../)

## Purpose

A board on an index page shows every case that matches, as the app boards it replaces did.

## ADDED Requirements

### Requirement: The index board shows every matching row

A self-fetching index page in board view SHALL ask for 500 rows per fetch instead of the table's page size, and SHALL give the table its own page size back when the reader leaves the board. When more rows match than it holds, the board SHALL say how many it shows of how many match and SHALL offer "Load more", which adds the next batch after the rows already shown. A batch whose query changed while it loaded SHALL be dropped. A host-fed page SHALL keep receiving `page-changed`.

#### Scenario: Werkbord with 284 open cases

- **GIVEN** a self-fetching index page over 284 matching cases, opened in board view
- **WHEN** it loads
- **THEN** it asks for one batch of 500 rows and the board holds all 284
- **AND** the footer reads "Toont 284 van 284" without a "Meer laden" button

#### Scenario: More cases than one batch

- **GIVEN** 612 matching cases in board view
- **WHEN** the reader presses "Meer laden"
- **THEN** page 2 is fetched and its 112 cases are added after the 500 already shown
- **AND** the footer reads "Toont 612 van 612"

#### Scenario: Back to the table

- **GIVEN** a page with a table page size of 25 in board view
- **WHEN** the reader switches to the table
- **THEN** the table fetches page 1 at 25 rows
