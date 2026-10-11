# app-look Delta: screens-one-scroller-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-one-scroller-parity](../../)

## Purpose

One scrollbar at the window edge and content that spans the content area,
under the board look.

## ADDED Requirements

### Requirement: The content spans the content area

Under the board look `--cn-board-content-max-width` SHALL be `none`: the
content of an index, dashboard and settings page SHALL span the whole width of
`NcAppContent`, so content grids (KPI rows, card grids, tables) grow with the
window and shrink only when the sidebar opens and takes its share. While the
sidebar is closed no space SHALL be reserved for it. This replaces the 1240px
maximum width of `screens-chrome-parity`.

#### Scenario: A wide window

- **GIVEN** a dashboard page under the board look with the navigation open and the sidebar closed, at 1920px
- **WHEN** it renders in a browser
- **THEN** the page is as wide as `NcAppContent` (1656px) and the grid ends 28px from the window edge

#### Scenario: The sidebar opens

- **GIVEN** the same page with the sidebar opened
- **WHEN** it renders
- **THEN** `NcAppContent` ends where the sidebar starts and the grid shrinks with it

@e2e include Mount an index page in a 1600px box under the board look; the page is as wide as the box.

### Requirement: One scrollbar at the window edge

Under the board look `NcAppContent` SHALL be the only vertical scroller of the
page: `CnDashboardPage` SHALL take its content's height and SHALL NOT scroll
itself. The navigation SHALL draw no scrollbar: the region above the list
(the primary action) SHALL take its content's height with visible overflow,
and the list SHALL draw no scrollbar while still scrolling a menu taller than
the window by wheel, touch and keyboard focus. An app without the look SHALL
render exactly as before.

#### Scenario: A dashboard taller than the window

- **GIVEN** a dashboard page under the board look whose widgets are taller than the window
- **WHEN** the user scrolls
- **THEN** `NcAppContent` scrolls and the dashboard page has `overflow-y: visible`

#### Scenario: The primary action

- **GIVEN** a navigation with a primary action under the board look
- **WHEN** it renders on a platform with classic scrollbars
- **THEN** no scrollbar track is drawn beside the primary action or beside the list
