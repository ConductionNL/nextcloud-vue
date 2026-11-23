# index-search-refusal Delta: index-search-refusal

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-search-refusal](../../)

## Purpose

A search the server could not read says so where it was typed, on every index page.

## ADDED Requirements

### Requirement: A refused search is said where it was typed

When a self-fetch fails with a 400, a search term is set, and the error carries a position (the body's `position`, or "at position N" in its message), CnIndexPage SHALL show, instead of its generic error state: that the search could not be read from character N, the term with that character marked, the server's reason, and `searchRefusalHint` (or the library's explanation of AND, OR, NOT and quotes). Any other failure SHALL keep the generic error state. `parseResponseError` SHALL carry a 400 body's `position`.

#### Scenario: An unclosed bracket

- **GIVEN** the Cases page in self-fetch mode
- **WHEN** the reader searches `verzoek (2026` and OpenRegister answers 400 "Unclosed bracket at position 9."
- **THEN** the page says the search could not be read from character 9, marks the `(`, and shows the reason and what to do

#### Scenario: A plain failure

- **GIVEN** a 400 without a position
- **THEN** the page shows the generic error state
