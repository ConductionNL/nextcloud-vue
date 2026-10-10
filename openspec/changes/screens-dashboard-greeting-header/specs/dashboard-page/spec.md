# dashboard-page Delta: screens-dashboard-greeting-header

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-dashboard-greeting-header](../../)

## Purpose

Let a dashboard draw the DqMijnWerk header: a greeting with the date in the
subtitle, a switch row with the view switch and link pills, and a header
without the page Actions menu.

## ADDED Requirements

### Requirement: The header subtitle can greet the reader

With `greeting` set to `true`, `"first"` or `"full"`, CnDashboardPage SHALL
render the header subtitle as the greeting for the time of day (with the
reader's first name, or full display name for `"full"`), today's date
written out in the user's locale, and the translated description when set,
joined by " · ". Without `greeting` the subtitle SHALL be the description
alone.

#### Scenario: An afternoon greeting

- **GIVEN** `greeting: true`, a reader named "Pieter Jansen", 14:30 and the description "website and portal"
- **WHEN** the page renders
- **THEN** the subtitle reads "Good afternoon, Pieter · <weekday day month year> · website and portal"

### Requirement: A switch row carries the view switch and link pills

In the board look CnDashboardPage SHALL render the page view switch on a row
under the header, left, instead of among the header actions. `viewLinks`
entries with a label and a `route` or `href` SHALL render on that row, right,
as pills of 34px with a 17px radius, 13px/600 text and an optional 14px icon,
labels through the host translate function. Without the board look the
view switch SHALL stay among the header actions.

#### Scenario: DqMijnWerk

- **GIVEN** the board look, two views and three `viewLinks`
- **WHEN** the page renders
- **THEN** a row under the header holds the view switch first and the three pills last, and the header actions hold no view switch

### Requirement: The header can drop the page Actions menu

With `showActionsMenu: false` CnDashboardPage SHALL NOT render the page
Actions menu in the header. By default it SHALL render it as before.

#### Scenario: A board page with buildiq and the primary only

- **GIVEN** `showActionsMenu: false`
- **WHEN** the page renders
- **THEN** the header has no Actions menu
