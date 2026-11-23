# page-header Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [page-header-breadcrumb](../../)

## Purpose

A list, dashboard or settings page says where it sits, the way a detail page does.

## ADDED Requirements

### Requirement: A list, dashboard or settings page can show a breadcrumb and a meta note

CnPageHeader SHALL draw, under the title, the declared crumbs followed by the title as the current crumb, then a middle
dot and the meta note, in the detail header's breadcrumb row markup. CnIndexPage, CnDashboardPage and CnSettingsPage
SHALL take `breadcrumb` and `headerMeta` from their config and draw them so. On an index page `{total}` and `{shown}` in
the meta SHALL be the list's counts. Without a breadcrumb and a meta the header SHALL be unchanged.

#### Scenario: A settings page with a breadcrumb and a note

- **GIVEN** a settings page titled "Zaaktypen" with `breadcrumb: { label: "Instellingen", route: "Settings" }` and
  `headerMeta: "Geldt voor de hele organisatie"`
- **THEN** under the title reads "Instellingen / Zaaktypen · Geldt voor de hele organisatie"
- **AND** "Instellingen" links to the Settings route

#### Scenario: An index page counts in its note

- **GIVEN** an index page with 12 objects in total and `headerMeta: "{total} lopend"`
- **THEN** the note reads "12 lopend"

#### Scenario: Nothing declared

- **GIVEN** a page without `breadcrumb` and `headerMeta`
- **THEN** its header is unchanged

### Requirement: A dashboard widget card can carry a line under its title

A dashboard widget definition's `subtitle` SHALL be drawn as a muted line under the card's title, through the host
translate function. CnWidgetWrapper SHALL take it as its `subtitle` prop. Without it the card is unchanged.

#### Scenario: A chart card with a subtitle

- **GIVEN** a widget titled "Op tijd beslist per zaaktype" with `subtitle: "Dit kwartaal, beslist binnen de termijn"`
- **THEN** the card shows the subtitle under the title

### Requirement: A dashboard can show its period on the description line

With `dateRange.control: "segmented"` and `dateRange.placement: "description"`, CnDashboardPage SHALL draw the segmented
period group at the end of the description line, after a middle dot, instead of in a row of its own. A date range with
a custom preset SHALL keep its row of its own. Without `placement` nothing changes.

#### Scenario: Week 41 · alle teams · the period

- **GIVEN** a dashboard with the description "Week 41 · alle teams" and a segmented date range placed on the description
- **THEN** the description line reads "Week 41 · alle teams ·" followed by the period group
- **AND** no separate period row is drawn
