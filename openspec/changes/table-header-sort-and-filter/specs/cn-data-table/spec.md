# cn-data-table Delta: table-header-sort-and-filter

**Status**: in-progress
**Scope**: nextcloud-vue

## Purpose

Every table header sorts and filters, with the filter state shared with the
facet sidebar.

## ADDED Requirements

### Requirement: Every backed column sorts by default

When `CnDataTable` has a schema, a column backed by a stored, non-object
schema property SHALL sort, whether or not it declares `sortable`. A column
with `sortable: false` SHALL NOT sort. A computed column (`aggregate`,
`compute`, `computed`, `virtual`) and a column without a backing property
SHALL NOT sort unless it declares `sortable: true`. Without a schema, only
`sortable: true` SHALL make a column sort.

#### Scenario: An object-form manifest column sorts

- **GIVEN** a schema with property `title` and a column `{ key: "title", label: "Title" }`
- **WHEN** the person clicks the Title header
- **THEN** the table SHALL emit `sort` with `{ key: "title", order: "asc" }`

#### Scenario: A widget column without a property does not sort

- **GIVEN** a column `{ key: "openDeals", widget: "badge" }` and no property `openDeals`
- **THEN** its header SHALL NOT be sortable

### Requirement: Every backed column filters from its header

With `filterable` set, every column that can filter SHALL show a filter
button in its header, labelled "Filter {column}". The panel SHALL fit the
column: enum (with `x-enum-labels`) as checkboxes, boolean as yes, no or any,
number and date as from and to, a reference (`$ref` or `fkResolve`) as a
searchable list of the referenced objects, and text as equals. A column with
`filterable: false` SHALL have no button. `CnIndexPage` SHALL pass
`filterable` by default; `headerFilters: false` SHALL turn it off for a page.

Opening the panel SHALL NOT sort. Escape SHALL close it without applying and
return focus to the button. An active filter SHALL show as a filled icon and
an "active" label on the button, and as a removable chip above the table.

#### Scenario: Filtering a status column

- **GIVEN** an enum column Status with values open and won
- **WHEN** the person opens its filter, ticks Won and applies
- **THEN** the table SHALL emit `column-filter` with `{ key: "status", params: { status: ["won"] } }`

#### Scenario: Removing a filter from its chip

- **GIVEN** an active filter `status: ["open"]`
- **WHEN** the person clicks the chip's remove button
- **THEN** the table SHALL emit `column-filter` with `{ status: [] }`

### Requirement: A header filter speaks the sidebar's query language

A header filter SHALL produce entries of the facet sidebar's active-filter
map: `key: [values]` for equality and any-of, `key[gte]` and `key[lte]` for a
range. `CnIndexPage` SHALL apply all entries of one column together, with
one fetch and one route update, so the filter persists in the route query
like `_order`.

#### Scenario: A range applies as one change

- **GIVEN** a self-fetching index page with `value[lte]: ["9"]` active
- **WHEN** the person sets Value from 5 with no upper bound
- **THEN** the active filters SHALL hold `value[gte]: ["5"]` and no `value[lte]`
- **AND** the page SHALL fetch once and update the route once
