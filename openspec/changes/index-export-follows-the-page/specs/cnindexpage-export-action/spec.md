# cnindexpage-export-action Delta: index-export-follows-the-page

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-export-follows-the-page](../../)

## Purpose

The export carries the filter the user sees, the menu appears where the
schema flag actually lives, and the mass export never exports the whole
schema by surprise. Row `rep-export` (humaniq matrix), and the sibling
halves named by stackiq, buildiq and larpinq.

## MODIFIED Requirements

### Requirement: Export action on index pages

When `CnIndexPage` is passed `allowExport: true` and the schema is flagged `exportable: true`, either as a top-level field or under `configuration.exportable`, an Export menu SHALL appear in the toolbar (or header bar) with CSV and Excel options. When both are set, the top-level field SHALL win.

#### Scenario: Export menu renders

- **GIVEN** a CnIndexPage with `allowExport: true` and a schema flagged `exportable: true`
- **WHEN** the page renders
- **THEN** an Export menu appears in the toolbar with "Export as CSV" and "Export as Excel" entries

@e2e include Render a test index page with `allowExport: true`; assert Export menu visible.

#### Scenario: The flag under configuration enables the menu

- **GIVEN** a CnIndexPage with `allowExport: true` and a schema whose `configuration.exportable` is true and which has no top-level `exportable`
- **WHEN** the page renders
- **THEN** the Export menu appears

### Requirement: Export delegates to OR export leaf

Clicking an export option SHALL navigate the browser to `GET /apps/openregister/api/objects/{register}/{schema}/export?format=csv|excel`, passing the same query the list last fetched with (search, sort, facet filters, the page's fixed filter and the active quick filter) as query parameters, without the paging parameters.

#### Scenario: CSV export with filters

- **GIVEN** an index page at route `/cases?status=open&assignee=me`
- **WHEN** the user clicks "Export as CSV"
- **THEN** the browser navigates to `/apps/openregister/api/objects/procest/case/export?format=csv&status=open&assignee=me`
- **AND** OpenRegister serializes the CSV (applies filters, honors RBAC access)

@e2e include Navigate to a filtered index page; click Export; verify the network request includes filters.

#### Scenario: The quick filter and the page filter reach the file

- **GIVEN** the Contracts page with `config.filter` keeping only Draft, Active and Inactive
- **AND** the user selected the Active quick filter and typed "gemeente" in the search box
- **WHEN** she clicks "Export as Excel"
- **THEN** the export URL carries the page filter, the Active filter and `_search=gemeente`
- **AND** carries no `_limit` and no `_page`

#### Scenario: Graceful fallback when export not available

- **GIVEN** a page with `allowExport: false` or a schema flagged exportable in neither place
- **THEN** no Export menu appears (no error, no broken UI)

@e2e include Render an index page without `allowExport` or a non-exportable schema; assert Export menu absent.

## ADDED Requirements

### Requirement: The mass export exports the selection or the filter

The mass-action Export SHALL export the selected rows when rows are
selected, and SHALL export the rows matching the list's current query
otherwise. The dialog SHALL say which of the two it will export, with
the count, before the user confirms. It SHALL NOT export rows outside
the current query.

#### Scenario: Nothing selected exports the filtered list

- **GIVEN** a list filtered to 340 of 2,000 rows and no selection
- **WHEN** the user opens the mass Export
- **THEN** the dialog says 340 rows matching the current filter will be exported
- **AND** the request carries the list's query

#### Scenario: A selection exports only the selection

- **GIVEN** 12 selected rows
- **WHEN** the user confirms the mass Export
- **THEN** the file holds those 12 rows
