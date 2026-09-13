# files-browser Delta: files-browser-columns

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [files-browser-columns](../../)

## Purpose

A files browser shows the columns its host declares, from the node, from a
DAV property or from the host's own per-file data, with a per-user
chooser. Competitor gap register row 4.8; consumed by dossiq's
`document-correspondents` and `scan-verdict-on-the-row`.

## ADDED Requirements

### Requirement: A host may declare the columns of a files browser

`CnFilesBrowser` SHALL accept a `columns` prop, and the manifest v2 `files`
widget config SHALL accept the same key. An entry SHALL be a built-in name
(`name`, `size`, `modified`, `owner`, `type`, `tags`) or an object with
`key`, `label`, `source` (`node`, `attribute`, `row`), `attribute`,
`formatter` and `sortable`. Without `columns` the browser SHALL render
name, size and modified as today.

#### Scenario: Default columns are unchanged

- **GIVEN** a files browser with no `columns`
- **WHEN** it renders a folder
- **THEN** the header shows name, size and modified in that order

#### Scenario: A declared column set replaces the defaults

- **GIVEN** `columns: ["name", { "key": "sender", "source": "row" }, "modified"]`
- **WHEN** it renders
- **THEN** the header shows name, Sender and modified, and no size column

#### Scenario: An unknown built-in name is refused

- **GIVEN** a widget config with `columns: ["name", "colour"]`
- **WHEN** the manifest is validated
- **THEN** validation fails and the message names the widget and `colour`

@e2e exclude schema and validator change, unit-tested via jest, no browser surface.

### Requirement: A column reads from the node, a DAV property or host row data

For `source: node` the cell SHALL show the node property named by `key`.
For `source: attribute` the browser SHALL request the DAV property in its
PROPFIND and show `node.attributes[attribute]`. For `source: row` the cell
SHALL show `rowData[fileid][key]`, where `rowData` is an object or a
function of the listed nodes the browser calls once per folder. Every cell
SHALL render through `CnCellRenderer` with the column's `formatter` and
the node as `row`. A `row` column without row data SHALL render empty.

#### Scenario: The scan verdict comes from a DAV property

- **GIVEN** a column `{ key: "scan", source: "attribute", attribute: "{http://owncloud.org/ns}av-status", formatter: "scanVerdict" }` and a host formatter `scanVerdict`
- **WHEN** the folder lists a file whose PROPFIND answers `av-status = clean`
- **THEN** the PROPFIND carried that property and the cell shows what `scanVerdict("clean")` returns

#### Scenario: Sender comes from the host's projection

- **GIVEN** a column `{ key: "sender", source: "row" }` and `rowData` as a function answering `{ 42: { sender: "Jansen" } }`
- **WHEN** the folder lists file 42
- **THEN** the function was called once with the listed nodes and the cell reads Jansen

#### Scenario: No row data, empty cell

- **GIVEN** the same column and no `rowData`
- **WHEN** it renders
- **THEN** the cell is empty and nothing is thrown

@e2e include Render a files browser with a `row` column and an `attribute` column against a seeded folder; assert the header cells, the PROPFIND body and both cell values.

### Requirement: Sorting and a per-user chooser

A `node` column SHALL sort through the existing `sortBy` with `aria-sort`
on its header. A `row` or `attribute` column with `sortable: true` SHALL
sort on its resolved value within the listed folder. The toolbar SHALL
offer a Columns chooser over the declared columns, stored per user under
a host key; the chooser SHALL hide declared columns and SHALL NOT add
undeclared ones.

#### Scenario: Hiding a column survives a reload

- **GIVEN** three declared columns and a user who unticks Sender
- **WHEN** the page reloads
- **THEN** the header shows the other two and Sender stays listed in the chooser

#### Scenario: Sorting on a row column

- **GIVEN** a `row` column `direction` with `sortable: true` and two files with `inbound` and `outbound`
- **WHEN** the user sorts on it
- **THEN** the rows reorder on that value and the header carries `aria-sort`

@e2e include Tick and untick a column in the chooser, reload, assert the header; click a sortable row column, assert order and `aria-sort`.
