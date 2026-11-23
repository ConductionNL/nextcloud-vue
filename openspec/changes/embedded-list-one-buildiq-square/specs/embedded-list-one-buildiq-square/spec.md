# embedded-list-one-buildiq-square Delta: embedded-list-one-buildiq-square

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [embedded-list-one-buildiq-square](../../)

## Purpose

One buildiq square per page, also when a detail page embeds a list.

## ADDED Requirements

### Requirement: An index page can leave the buildiq square out of its toolbar

CnIndexPage SHALL accept `buildiqButton` (default `true`). When it is
`false`, the actions bar SHALL NOT draw the buildiq square. CnIndexListWidget
SHALL pass `buildiqButton: false`, because the page around it draws the square.

#### Scenario: A list embedded in a detail page

- **GIVEN** a detail page with an `index-list` widget
- **WHEN** the widget's list renders its toolbar
- **THEN** the toolbar has no buildiq square, and the page header keeps its own

#### Scenario: A list page

- **GIVEN** an index page without `buildiqButton`
- **WHEN** it renders
- **THEN** the square is placed as before
