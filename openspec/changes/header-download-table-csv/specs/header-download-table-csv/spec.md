# header-download-table-csv Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [header-download-table-csv](../../)

## ADDED Requirements

### Requirement: A header action can download a table on the page

An object table with an `exportId` SHALL download the rows it holds as CSV, with its columns, when an `export` action
naming that `exportId` is dispatched, and SHALL ignore one naming another id. It SHALL stop listening when it is gone.
An `export` action without `exportId` SHALL keep opening the export dialog.

#### Scenario: Catalogue download

- **GIVEN** the catalogue page's object types table with `exportId: "object-types"`
- **WHEN** the reader presses Download in the page header (`{ type: "export", exportId: "object-types" }`)
- **THEN** the object types download as CSV
