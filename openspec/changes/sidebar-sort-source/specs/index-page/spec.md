# index-page Delta: sidebar-sort-source

**Status**: in-progress
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A sort option can take its rows from an endpoint

A self-fetch index page SHALL offer a `sortSelectOptions` entry that names a `source` in the sidebar's Sort section. The entry SHALL be chosen by its value and SHALL have no direction. While it is chosen, the page SHALL list the endpoint's rows in the endpoint's order, with its search box, sidebar filters and pager applied to those rows in the browser.

- An option with `default: true` SHALL be chosen when the page opens, unless the address carries an `_order`.
- An order by sort keys SHALL leave it. That includes a column header click in the table view.
- When the endpoint fails, the page SHALL order the self-fetched list by the option's `order` and show its `failedNote`.
- `selectSortOption(value)` SHALL choose an option by its value.

#### Scenario: The page opens on urgency

- **GIVEN** an option `urgency` with `default: true` and a source whose entries carry the case at `case`
- **WHEN** the page opens
- **THEN** it lists the cases in the endpoint's order, and the Sort section shows "Current order: Urgency"

#### Scenario: Search and filters narrow the ranked rows

- **GIVEN** the urgency rows are listed
- **WHEN** the reader types a term or picks a status in the sidebar
- **THEN** only the matching rows remain, in their ranked order, from page 1

#### Scenario: A column header leaves the ranked order

- **GIVEN** the urgency rows are listed in the table view
- **WHEN** the reader clicks the Title header
- **THEN** the list is the self-fetched one ordered by title

#### Scenario: The endpoint fails

- **WHEN** the urgency endpoint answers an error
- **THEN** the list is the self-fetched one ordered by the option's `order`, with the `failedNote` above it

### Requirement: A row field the source supplies reaches every order

A source's `carry` fields SHALL be copied onto each of its rows. With `annotate: true` they SHALL also be copied onto the rows of every other order that share the row's `idPath` identity, unless that row already holds the field. A `cardLayout.headPill` naming such a field SHALL draw it.

#### Scenario: A tier pill under Newest

- **GIVEN** a source with `carry: ['deadlineTier']` and `annotate: true`, and a card layout whose head pill reads `deadlineTier`
- **WHEN** the reader chooses Newest
- **THEN** each card of a ranked case still shows its tier pill
