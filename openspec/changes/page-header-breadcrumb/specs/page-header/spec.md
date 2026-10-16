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
