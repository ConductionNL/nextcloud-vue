# pl4-board-list-stages Delta: pl4-board-list-stages

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [pl4-board-list-stages](../../)

## Purpose

A board takes its columns from a list on a parent row and keeps closed stages out of the way.

## ADDED Requirements

### Requirement: Columns can be a list on a parent row

A board column field whose `source` has `itemsPath` SHALL take its columns from the items of that list on each
referenced row, keyed by `keyField` (default `name`). A card SHALL sit in the column its field value names, and a drop
SHALL write that key. Each item SHALL be linked to its row under `_parent`, so `narrowBy` narrows the columns to the
parent the page filters on.

#### Scenario: A pipeline's stages

- **GIVEN** pipelines with `stages` lists and a lead board narrowed to pipeline Sales
- **THEN** the columns are Sales's stages in their `order`, and dropping a lead on Proposal writes `stage: "Proposal"`

### Requirement: A closed stage starts collapsed

A state marked closed (`closedField`) SHALL render its column with its header and count but no cards, and a
"Show N more" button that opens it. The column SHALL still take a drop.

#### Scenario: Won deals

- **GIVEN** the Won stage has `isClosed: true` and holds 40 leads
- **THEN** its column shows 40 and no cards until the reader opens it
