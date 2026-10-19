# index-page Delta: index-sort-source

**Status**: in-progress
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A sort option can take its rows from an endpoint

A self-fetch index page SHALL list the rows of an app endpoint, in the endpoint's order, while a `sortSelectOptions` entry that names a `source` is chosen.

- The page's search box, sidebar filters and pager SHALL apply to those rows in the browser. The search matches `source.searchFields`, or else every top-level text.
- An option with `default: true` SHALL be chosen when the page opens, unless the address carries an `_order`.
- When the endpoint fails, the page SHALL order the self-fetched list by the option's `order` and show the option's `failedNote`.

#### Scenario: The page opens on urgency

- **GIVEN** an option `urgency` with `default: true` and a source whose entries carry the case at `case`
- **WHEN** the page opens
- **THEN** it lists the cases in the endpoint's order, and the sort select shows Urgency

#### Scenario: Search and filters narrow the ranked rows

- **GIVEN** the urgency rows are listed
- **WHEN** the reader types a term or picks a status in the sidebar
- **THEN** only the matching rows remain, in their ranked order, from page 1

#### Scenario: The endpoint fails

- **WHEN** the urgency endpoint answers an error
- **THEN** the list is the self-fetched one ordered by the option's `order`
- **AND** the option's `failedNote` shows above it

### Requirement: A row field the source supplies reaches every order

A source's `carry` fields SHALL be copied onto each of its rows. With `annotate: true` they SHALL also be copied onto the rows of every other order that share the row's `idPath` identity, unless that row already holds the field.

#### Scenario: A tier pill under Newest

- **GIVEN** a source with `carry: ['deadlineTier']` and `annotate: true`, and a card layout whose head pill reads `deadlineTier`
- **WHEN** the reader chooses Newest
- **THEN** each card of a ranked case still shows its tier pill
