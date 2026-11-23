# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [search-source-term-in-box](../../)

## Purpose

The search page shows and edits the term it searched for.

## ADDED Requirements

### Requirement: The search page keeps its term in the search box

An index page on the `search` source SHALL start its search box with the source's term (`sourceConfig.term`, else the
address's `?q=` or `termQuery`) and SHALL search again with what the box holds. Once the box has been used, an empty box
SHALL search nothing. On the board look the Active line SHALL show the term as the first chip, "Search term: {term}";
removing that chip, or "Clear all", SHALL empty the box.

#### Scenario: Opened from the header search

- **GIVEN** the search page opened at `/search?q=Lindelaan`
- **WHEN** the page loads
- **THEN** the search box holds "Lindelaan", the results are for "Lindelaan" and the Active line reads "Zoekterm: Lindelaan"

#### Scenario: A new term

- **GIVEN** the page showing results for "Lindelaan"
- **WHEN** the reader types "Molenweg" in the search box
- **THEN** the results and the chip are for "Molenweg"

#### Scenario: The chip removed

- **GIVEN** the chip "Zoekterm: Lindelaan"
- **WHEN** the reader removes it
- **THEN** the box is empty and no results are shown
