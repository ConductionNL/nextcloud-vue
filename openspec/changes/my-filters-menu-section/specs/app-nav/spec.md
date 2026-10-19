# app-nav Delta: my-filters-menu-section

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [my-filters-menu-section](../../)

## Purpose

Give every app the same place for the user's pinned filters.

## ADDED Requirements

### Requirement: Every app menu ends with My filters

When the manifest has a page that offers saved filters, CnAppRoot SHALL end the menu's main entries with a "My filters" caption followed by one entry per pinned filter (linking to its page with `?savedFilter=<id>`), after every other main entry and so above the footer entries. With no pinned filter the caption SHALL be followed by one muted line, without a link, saying how to add a filter. An app without saved filters SHALL get no section.

#### Scenario: A pinned filter

- **GIVEN** an app whose menu has Dashboard, Cases and Contacts, a Help footer entry, and the pinned filter "Mine, overdue" on Cases
- **WHEN** the menu renders
- **THEN** "My filters" and "Mine, overdue" follow Contacts, and Help stays in the footer

#### Scenario: Nothing pinned

- **GIVEN** the same app with no pinned filter
- **WHEN** the menu renders
- **THEN** "My filters" ends the menu with the line "Zet een filter in het menu via Filters"
