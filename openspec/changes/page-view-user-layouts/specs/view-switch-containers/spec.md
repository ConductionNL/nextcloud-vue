# view-switch-containers Delta: page-view-user-layouts

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [page-view-user-layouts](../../)

## Purpose

Let a user arrange the grid inside each view of a page for themselves, and
keep that arrangement per view.

## ADDED Requirements

### Requirement: A user arranges each view for themselves

When a dashboard or detail page has `userLayout: true` and `views`, the user
SHALL be able to drag and resize the widgets of the chosen view: on a
dashboard while edit mode is on, on a detail page while "Arrange view" is on.
The arrangement SHALL be stored per view, per page and per user as a user
preference under `dashboard-layout.<page>.view.<view>`, written to the server
and mirrored in the browser, and SHALL be saved once when the user leaves edit
mode (dashboard) or presses "Done" (detail page), never per drag. The view's
manifest `layout` SHALL NOT be changed by a user's arrangement. The manifest
decides which widgets a view has; the stored record only moves them. A page
without `userLayout` SHALL read no view arrangement and keep writing a drag
into the manifest view, as before.

#### Scenario: The stored arrangement renders

- **GIVEN** a dashboard with `userLayout: true` and a stored record for view `mine` that puts `my-cases` at column 6
- **WHEN** the page opens on view `mine`
- **THEN** `my-cases` renders at column 6

#### Scenario: A drag is stored on leaving edit mode

- **GIVEN** a dashboard with `userLayout: true` in edit mode
- **WHEN** the user drags `my-cases` in view `mine` twice and leaves edit mode
- **THEN** one record is written for `dashboard-layout.dash.view.mine` with the last position
- **AND** the manifest layout of view `mine` is unchanged

#### Scenario: Each view keeps its own arrangement

- **GIVEN** the user moved a widget in view `mine`
- **WHEN** they switch to view `team`
- **THEN** `team` renders its own layout and leaving edit mode stores only `mine`

#### Scenario: The arrangement is remembered on the next visit

- **GIVEN** the user stored an arrangement of view `mine`
- **WHEN** the page opens again
- **THEN** the arrangement renders from the browser mirror before the server answers

#### Scenario: A detail page arranges a view

- **GIVEN** a detail page with `userLayout: true` and views
- **WHEN** the user presses "Arrange view", moves a widget and presses "Done"
- **THEN** the view grid was draggable only while arranging and the record for that view is stored

### Requirement: Resetting a view restores its manifest layout

A reset SHALL drop the user's record for the chosen view, render that view
with its manifest layout and emit `view-layout-reset` with `{ view }`. Other
views SHALL keep the user's arrangement. A dashboard with `userLayout` SHALL
offer "Reset layout" in edit mode, which resets the page's own grid and the
chosen view. A detail page SHALL offer "Reset view" while arranging.

#### Scenario: Reset returns one view to the manifest

- **GIVEN** stored arrangements for views `mine` and `team`
- **WHEN** the user presses "Reset layout" on view `mine`
- **THEN** `mine` renders its manifest layout, its record is emptied, and the record for `team` is unchanged
