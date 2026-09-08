# index-page Delta: index-columns-per-scope

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-columns-per-scope](../../)

## Purpose

A `folderSidebar` scope carries its own columns, default sort and search
fields, so one index page shows each case type the way that type needs.
Competitor row B10 of the dossiq round 2 analysis.

## ADDED Requirements

### Requirement: A sidebar scope may declare its own list layout

The manifest v2 schema SHALL accept optional `columns`, `defaultSort` and
`searchFields` on a `folderSidebar` scope entry. `columns` SHALL accept the
same shapes as `config.columns`. A scope without the keys SHALL validate as
before.

#### Scenario: Scope with columns validates

- **GIVEN** a scope entry with `columns: ["identifier", "deadline"]` and `defaultSort: { key: "deadline", order: "asc" }`
- **WHEN** the manifest is validated
- **THEN** validation passes

#### Scenario: Unknown column key is refused

- **GIVEN** a scope entry whose `columns` names a key the page schema does not define
- **WHEN** the manifest is validated
- **THEN** validation fails and the message names the scope id and the key

@e2e exclude schema and validator change, unit-tested via jest, no browser surface.

### Requirement: The active scope drives columns, sort and search

When the active `folderSidebar` scope declares `columns`, `defaultSort` or
`searchFields`, `CnIndexPage` SHALL use them in place of the page values.
Changing scope SHALL re-render the header and refetch with the scope's sort.
A scope without the keys SHALL fall back to the page values.

#### Scenario: Switching scope changes the header

- **GIVEN** an index page with page columns `[title, status]` and a scope "permit" with columns `[identifier, requester, deadline]`
- **WHEN** the user selects the "permit" folder
- **THEN** the table header shows identifier, requester and deadline and the fetch carries the scope's sort

#### Scenario: Scope without keys inherits

- **GIVEN** a scope "complaint" with no `columns`
- **WHEN** the user selects it
- **THEN** the table header shows title and status

#### Scenario: Search is limited to the scope's fields

- **GIVEN** a scope with `searchFields: ["identifier", "requester"]`
- **WHEN** the user searches "Jansen"
- **THEN** the request carries those two fields as the search fields

@e2e include Render an index page with two sidebar scopes, one with columns; click each folder; assert the header cells and the query of the fetch.

### Requirement: A schema-derived folder reads its layout from the row

When `folderSidebar` derives its folders from rows of a schema, a row carrying
`x-index.columns`, `x-index.defaultSort` or `x-index.searchFields` SHALL supply
those values for its folder. A value declared on the folder entry itself SHALL
win over the row value.

#### Scenario: Case type row carries its columns

- **GIVEN** folders derived from `caseType` rows and a row "permit" with `x-index.columns: ["identifier", "location"]`
- **WHEN** the user selects the "permit" folder
- **THEN** the table header shows identifier and location

#### Scenario: Declared folder wins

- **GIVEN** the same row and a folder entry for "permit" declaring `columns: ["identifier"]`
- **WHEN** the user selects it
- **THEN** the table header shows identifier only

@e2e include Seed a caseType row with `x-index.columns`; render the derived sidebar; select the folder; assert the header.
