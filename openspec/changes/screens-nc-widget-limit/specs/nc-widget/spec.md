# nc-widget Delta: screens-nc-widget-limit

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-nc-widget-limit](../../)

## Purpose

A Nextcloud dashboard widget fits the cell it is placed in.

## ADDED Requirements

### Requirement: A Nextcloud widget shows at most its limit

An `nc-widget` with `content.limit` SHALL draw at most that many items, read from the items API first, and SHALL draw
a "Show all" link to `showAllUrl` or else the widget's own page when one is known. Without `limit` the widget SHALL
render as before.

#### Scenario: Activity in a short cell

- **GIVEN** the activity widget with `limit: 2` and seven items
- **WHEN** it renders in a 240px cell
- **THEN** two items show, the list does not scroll, and "Show all" links to the activity page
