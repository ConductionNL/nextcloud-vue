# app-nav Delta: my-views-menu-section

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [my-views-menu-section](../../)

## Purpose

Give every app the same place for the user's pinned views.

## ADDED Requirements

### Requirement: Every app menu ends with My views

When the manifest has a page that offers saved views, CnAppRoot SHALL end the menu's main entries with a "My views" caption followed by one entry per pinned view (linking to its page with `?savedView=<id>`), after every other main entry and so above the footer entries. With no pinned view the caption SHALL be followed by one muted line, without a link, saying how to add a view. An app without saved views SHALL get no section.

#### Scenario: A pinned view

- **GIVEN** an app whose menu has Dashboard, Cases and Contacts, a Help footer entry, and the pinned view "Mine, overdue" on Cases
- **WHEN** the menu renders
- **THEN** "My views" and "Mine, overdue" follow Contacts, and Help stays in the footer

#### Scenario: Nothing pinned

- **GIVEN** the same app with no pinned view
- **WHEN** the menu renders
- **THEN** "My views" ends the menu with the line "Zet een weergave in het menu via Filters"

### Requirement: Default views from the user delta join the page defaults

`mergeManifestDelta` SHALL merge an index page's `defaultSavedViews` by `slug`: a delta entry with a new slug SHALL be added, one with an existing slug SHALL patch it, and `$op: "remove"` SHALL delete it. A menu entry `default:<slug>` SHALL resolve against the merged list, so a default view that arrives through the per-user `/api/manifest` delta stays in the menu.

#### Scenario: Case type pins

- **GIVEN** a Cases page shipping the default view `woo-requests`, and a user delta adding `pin-objection` and `pin-complaint`
- **WHEN** the manifest merges
- **THEN** the page has all three default views, and the user's menu entry `default:pin-objection` stays
