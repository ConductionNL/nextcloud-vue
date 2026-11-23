# board-saved-search-cards Delta: board-saved-search-cards

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-saved-search-cards](../../)

## Purpose

Match the saved search and exports side cards to DqZoekresultaten.

## ADDED Requirements

### Requirement: The saved search cards match the board

In the board look the saved-view alert card SHALL run at a normal line
height with its parts 10px and its facts 8px apart, its values at weight 500
and its switch words at 15px. Each export SHALL have a line above it, its
name at 15px/500, its text at least 240px wide so a narrow card puts the
34px Download button on its own line. The Download button SHALL carry a
download icon in both looks.

#### Scenario: Narrow card

- **GIVEN** the exports card in a 300px side column in the board look
- **WHEN** an export with a Download button renders
- **THEN** the button sits under the name and meta, 34px tall with a download icon
