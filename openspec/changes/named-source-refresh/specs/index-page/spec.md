# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [named-source-refresh](../../)

## Purpose

Refresh does what it says on every list.

## ADDED Requirements

### Requirement: Refresh reads a named source again

On an index page over a named source, Refresh (the header's Actions menu entry or a `refresh` header button) SHALL read
the source again with the active tab, filters and search, and SHALL emit `refresh` as on a register list.

#### Scenario: DqPostvak

- **GIVEN** the inbox page
- **WHEN** the reader picks Acties, Vernieuwen
- **THEN** the inbox is read again
