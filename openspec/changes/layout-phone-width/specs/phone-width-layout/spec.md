# phone-width-layout Specification

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [layout-phone-width](../../)

## Purpose

Pages drawn by the library work at phone width without horizontal
scrolling. Answers the humaniq `self-service-mobile` and larpinq
`admin-phone-friendly-pages` dependencies, and WCAG 2.1 success criterion
1.4.10.

## ADDED Requirements

### Requirement: A narrow table shows its rows as cards

`CnDataTable` SHALL render each row as a card when its container is
narrower than 600 pixels: the title column as heading, the next visible
columns as label and value pairs, and the selection box and row actions
in the card. Row click, selection and keyboard focus SHALL keep working.
A page with `config.stackOnNarrow: false` SHALL keep the table.

#### Scenario: A player checks her sheet between scenes

- GIVEN Anna opens her character's abilities list on a phone 360 pixels wide
- WHEN the list loads
- THEN each ability is a card with its name as heading
- AND the page does not scroll sideways

#### Scenario: A split view on a desktop

- GIVEN a list in a split view whose list pane is 480 pixels wide on a 1440 pixel screen
- WHEN it renders
- THEN the list shows cards, because the pane is narrow

### Requirement: A dashboard reflows to one column at phone width

`CnDashboardPage` SHALL pass a responsive column configuration to its
grid unless the page supplies its own or sets `config.responsive: false`,
so that at phone width its widgets stack in one column in reading order.

#### Scenario: My HR on a phone

- GIVEN humaniq's Mijn HR dashboard with three widgets side by side on a desktop
- WHEN an employee opens it on a phone
- THEN the three widgets are stacked top to bottom
- AND the page does not scroll sideways

### Requirement: The index page's controls fit a phone

Below the breakpoint `CnActionsBar` SHALL keep Add and search visible and
SHALL move its other actions into one Actions menu, and `CnIndexSidebar`
SHALL open as a full-width panel with a close button.

#### Scenario: Filtering on a phone

- GIVEN the Events index on a phone
- WHEN the game master opens Search and columns
- THEN the panel covers the list with a close button
- AND closing it shows the filtered list

### Requirement: Forms are full screen at phone width

At phone width `CnFormDialog` SHALL open full screen with one column of
fields and its Save action in view while the fields scroll.

#### Scenario: A leave request on a phone

- GIVEN an employee on a phone
- WHEN she opens New leave request
- THEN the form fills the screen and Save stays visible as she scrolls

### Requirement: The phone layout is checked where layout exists

A Playwright check SHALL open an index page, a detail page, a dashboard
and an open form dialog on the harness at 360 by 740 pixels and SHALL
fail when any of them scrolls horizontally.

#### Scenario: An overflowing component fails the check

- GIVEN a change that gives a table cell a fixed width of 500 pixels
- WHEN the phone check runs
- THEN it fails naming the page that scrolls sideways
