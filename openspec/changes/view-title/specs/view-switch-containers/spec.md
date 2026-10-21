# view-switch-containers Delta: view-title

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [view-title](../../)

## Purpose

Let the dashboard title name the open view.

## ADDED Requirements

### Requirement: The page title follows the open view

When the open view of a dashboard declares a `title`, CnDashboardPage SHALL render that title, translated, as the page
heading. A view without a `title` SHALL leave the page's own title.

#### Scenario: My team

- **GIVEN** views "My work" and "My team" with title "Team work" translated as "Mijn team"
- **WHEN** the "My team" view is open
- **THEN** the page heading reads "Mijn team"
