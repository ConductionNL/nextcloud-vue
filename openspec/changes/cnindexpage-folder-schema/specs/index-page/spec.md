# index-page Delta: cnindexpage-folder-schema

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [cnindexpage-folder-schema](../../)

## Purpose

A `folderSidebar` folder switches which register and schema `CnIndexPage`
lists, not only which rows of the page's own schema show. Split out of
dossiq's `contacts-domain` change, task 2.2, on Ruben's 2026-09-11 decision:
the same seam every index page in the fleet needs, not a dossiq-only fix.

## ADDED Requirements

### Requirement: A folder may declare its own schema

A `folderSidebar` folder entry SHALL accept optional `schema` and `register`
keys. `register` SHALL default to the page's own `register` prop when
omitted. A folder that declares neither key SHALL filter the page's existing
schema exactly as before.

#### Scenario: Folder without schema is unaffected

- **GIVEN** a `folderSidebar` folder with no `schema` key
- **WHEN** the folder is selected
- **THEN** the page keeps its own register and schema and filters by
  `filterField`/`field` as it does today

#### Scenario: Folder with schema validates with no manifest schema change

- **GIVEN** a folder entry `{ "id": "kvkCompany", "schema": "kvkCompany" }`
- **WHEN** the manifest is validated
- **THEN** validation passes, because `config` already accepts arbitrary
  keys

@e2e exclude manifest shape only, no browser surface; covered by the
component test in Task 1.

### Requirement: Selecting a schema folder switches the loaded object type

When the active `folderSidebar` folder declares `schema`, `CnIndexPage`
SHALL load that register and schema in place of its own `register`/`schema`
props: columns, fetch, pagination, facets and the live-update subscription
SHALL all key off the folder's object type while it is active. Returning to
"All", or to a folder that declares no `schema`, SHALL restore the page's own
object type.

#### Scenario: Switching to a schema folder reloads the list

- **GIVEN** a Contacts index page over `brpPerson` with a folder "Organisations"
  declaring `schema: kvkCompany`
- **WHEN** the user selects "Organisations"
- **THEN** the table shows `kvkCompany` rows and columns and the fetch
  targets `dossiq-kvkCompany`

#### Scenario: Returning to All restores the page's own schema

- **GIVEN** the state above, with "Organisations" active
- **WHEN** the user selects "All"
- **THEN** the table shows `brpPerson` rows again

#### Scenario: Live updates follow the active schema

- **GIVEN** the state above, with "Organisations" active
- **WHEN** a `kvkCompany` object changes on the server
- **THEN** the table reflects the change, and a subsequent `brpPerson`
  change made while still on "Organisations" does **not** appear until the
  user switches back

#### Scenario: A page with no schema-declaring folders is unchanged

- **GIVEN** an existing `folderSidebar` page whose folders never declare
  `schema` (`source: custom`, `field`, `register`, or `files`)
- **WHEN** any folder is selected
- **THEN** the fetch, pagination and subscription behave exactly as they do
  without this change

@e2e include Render an index page with a folder that declares `schema` and
one that does not; switch between them and to "All"; assert the table's
columns, the fetch target and that a live update for the inactive schema is
not applied.

### Requirement: Switching schema clears row selection

When the active object type changes because a schema-declaring folder was
selected or deselected, `CnIndexPage` SHALL clear any selected rows and
SHALL close a form, delete or copy dialog left open from the previous
schema.

#### Scenario: Selection does not carry across schemas

- **GIVEN** one or more `brpPerson` rows selected
- **WHEN** the user switches to the "Organisations" folder
- **THEN** the selection is empty and mass actions are disabled until new
  rows are selected

#### Scenario: An open dialog closes on switch

- **GIVEN** an edit dialog open for a `brpPerson` row
- **WHEN** the user switches to the "Organisations" folder
- **THEN** the dialog closes rather than showing the `brpPerson` row against
  `kvkCompany` fields

@e2e include Open an edit dialog, switch the active schema folder, assert
the dialog is closed and the selection is empty.
