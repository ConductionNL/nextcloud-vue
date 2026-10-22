# index-header Delta: index-actions-menu-selection-export

## ADDED Requirements

### Requirement: The Actions menu exports the selection

The header Actions menu SHALL offer the built-in `export-selected` when its
`items` name it and the list's own export is allowed: `allowExport`, a schema
flagged exportable, and a register and schema slug to export from. Without
any of those it SHALL not be drawn, and SHALL not export when run. The entry SHALL be disabled, with a title saying why, until
one or more rows are selected. It SHALL read "Export selection as JSON"
through the library's translate. Choosing it SHALL download OpenRegister's JSON
export of the page's register and schema with the selected ids as `_ids`.

#### Scenario: Two selected case types as JSON
- **GIVEN** the case type list with `items: ["export-selected"]` and two rows selected
- **WHEN** the person chooses "Selectie exporteren als JSON"
- **THEN** the browser opens `/apps/openregister/api/objects/dossiq/caseType/export?format=json&_ids[]=<id 1>&_ids[]=<id 2>`

#### Scenario: Nothing selected
- **GIVEN** no row selected
- **WHEN** the menu is drawn
- **THEN** the entry SHALL be disabled

### Requirement: A header action can be offered to administrators only

A header action with `adminOnly: true` SHALL be left out of the header actions,
the Actions menu included, and a header button that runs it SHALL not be drawn,
unless Nextcloud reports the viewer as an administrator. Without `adminOnly` nothing SHALL change.

#### Scenario: A user who is not an administrator
- **GIVEN** a header action "Reload templates" with `adminOnly: true`
- **WHEN** a user who is not an administrator opens the list
- **THEN** the Actions menu SHALL not list it
