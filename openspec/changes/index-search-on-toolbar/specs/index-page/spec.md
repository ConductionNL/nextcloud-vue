# index-page Delta: index-search-on-toolbar

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-search-on-toolbar](../../)

## Purpose

Let an index page put its search field on the toolbar row.

## ADDED Requirements

### Requirement: The search field can sit on the toolbar row

With `searchPlacement: "toolbar"` under the board look, CnIndexPage's actions bar SHALL draw the search field on row 1, before the Filter button and the view switch, taking the room they leave, and SHALL NOT draw it on row 2. The default SHALL keep the search at the start of row 2. Outside the board look the key SHALL change nothing.

#### Scenario: The team queue

- **GIVEN** a board index page with `searchPlacement: "toolbar"`, a filter sidebar and a view switch, 800px wide
- **WHEN** it renders
- **THEN** the search field sits on the Filter button's row, left of it, at least 220px wide
