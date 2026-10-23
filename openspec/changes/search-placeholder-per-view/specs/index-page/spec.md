# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [search-placeholder-per-view](../../)

## Purpose

Each view of a list asks its search in the board's words.

## ADDED Requirements

### Requirement: The search placeholder can differ per view

CnIndexPage SHALL show `searchPlaceholderByView[<open view>]`, through the app's translate, as the search field's
placeholder when it names the open view (`table`, `cards`, `board`, `map`), and the page's (or its preset's)
`searchPlaceholder` otherwise.

#### Scenario: DqWerkbord

- **GIVEN** the cases list with `searchPlaceholderByView: { board: "Search by case or requester" }`
- **WHEN** the reader switches to the board view
- **THEN** the search field asks "Zoek op zaak of verzoeker"
