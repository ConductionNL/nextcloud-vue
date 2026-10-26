# lpvandaag-start-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [lpvandaag-start-page](../../)

## Purpose

The library pieces launchpad's LpVandaag start page is built from.

## ADDED Requirements

### Requirement: A dashboard can fill the height below the top bar

With `fillHeight`, the dashboard grid SHALL, in view mode and when it is at least `fillMinWidth` pixels wide, divide
the height its host gives it over the layout rows. A row whose items all set `fitRows: true` SHALL take its content's
height. Every other row SHALL take an equal share of the remaining height. A cell SHALL scroll content that does not
fit. In edit mode, and on a narrower grid, the grid SHALL keep its GridStack rows of `cellHeight`. Without `fillHeight`
nothing SHALL change.

#### Scenario: LpVandaag at 1440×900

- **GIVEN** the start page with `fillHeight`, its header, "Vandaag eerst" and counters set to `fitRows`
- **THEN** the page does not scroll, and the Apps, Agenda and "Verder waar u was" cards share the height that is left

#### Scenario: Editing

- **WHEN** the person starts editing the dashboard
- **THEN** the grid is the GridStack grid again, with drag and resize

### Requirement: A header can carry the greeting under its title

With `greetingLine: true` and a title, the header widget SHALL draw the title as its heading and SHALL draw the
greeting, the date (`showDate`) and the ISO week (`showWeek`) on one line under it, joined by " · ". Without a title
the greeting SHALL stay the heading, as before.

#### Scenario: Vandaag

- **GIVEN** `{ title: "Vandaag", greeting: true, showDate: true, showWeek: true, greetingLine: true }` on Monday 5
  October 2026 in the afternoon, for Pieter Jansen
- **THEN** the heading reads "Vandaag" and the line under it "Goedemiddag, Pieter · maandag 5 oktober 2026 · week 41"

### Requirement: The apps a person can open are tiles

The `app-tiles` widget SHALL draw one tile per app of Nextcloud's navigation, or per app in `content.apps`, with the
app's icon, its name, a status dot and a link to the app. Apps in `content.pinned` SHALL come first, with a pin. An app
reported down SHALL carry an outage badge. A filter field SHALL narrow the tiles by name. A "Most used" row SHALL offer
the apps this reader opened most from the widget, with how often, counted in the reader's own browser.

#### Scenario: Filter

- **WHEN** the person types "ag" in the filter
- **THEN** only the tiles whose name holds "ag" remain

### Requirement: One more button holds the page's actions in groups

`CnGroupedMenu` SHALL draw one button that opens a menu of titled groups over one or two columns. Items SHALL be links,
router links or buttons. An item with `checked` SHALL be a radio item. The arrow keys SHALL move through every item of
both columns, Home and End SHALL jump to the first and the last, and Escape SHALL close the menu and return focus to
the button. Choosing an item SHALL run it and close the menu.

#### Scenario: Meer

- **WHEN** the person opens "Meer" on the start page
- **THEN** Dashboards and Instellingen stand on the left, Dit dashboard and Launchpad on the right
