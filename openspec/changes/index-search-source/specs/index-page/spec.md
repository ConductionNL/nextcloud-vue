# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-search-source](../../)

## Purpose

One search answers across the kinds of records a reader works with.

## ADDED Requirements

### Requirement: An index page can search several schemas and files

With `entitySource: "search"`, CnIndexPage SHALL search the term over every kind in `sourceConfig.kinds` (OpenRegister
schemas with `_search`, the reader's files with Nextcloud's unified search), list the results with their kind, and draw
an "All" quick filter plus one per kind, each with its count. A kind that fails SHALL not stop the others.

#### Scenario: Zoeken op Lindelaan

- **GIVEN** kinds Zaken (case), Objecten (asset) and Documenten (files) and the term "Lindelaan"
- **THEN** the quick filters read "All 24", "Zaken 9", "Objecten 14", "Documenten 1"
- **AND** picking "Objecten" lists only the objects
