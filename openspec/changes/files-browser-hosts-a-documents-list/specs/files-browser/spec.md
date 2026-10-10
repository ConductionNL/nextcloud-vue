## ADDED Requirements

### Requirement: A manifest files widget can feed the browser's columns

CnFilesTab SHALL forward `columns`, `preferenceApp` and `preferenceKey` to CnFilesBrowser. CnFilesTab SHALL take `rowDataUrl` (an app-relative endpoint in which the placeholder objectId in curly braces is replaced by the object id), `rowDataPath` (default empty) and `rowDataKey` (default `fileId`), and SHALL pass CnFilesBrowser a `rowData` function that reads the endpoint once per listing and keys the records by the value of `rowDataKey`. The answer SHALL be read as a list of records, the list at `rowDataPath`, or a list under `items` or `results`; an object that is none of these SHALL be taken as already keyed by file id; a record without a key SHALL be skipped. Without `rowDataUrl` no `rowData` SHALL be passed.

#### Scenario: Sender column from the host's records
- **GIVEN** a files widget with a `source: 'row'` column `senderName` and a `rowDataUrl` answering `{ documents: [{ fileId: 12, senderName: 'Gemeente' }] }` with `rowDataPath: 'documents'`
- **WHEN** the folder lists file 12
- **THEN** the endpoint SHALL be read once
- **AND** file 12's Sender cell SHALL read "Gemeente"

#### Scenario: No endpoint
- **GIVEN** a files widget without `rowDataUrl`
- **THEN** the browser SHALL get no `rowData` and its `row` cells SHALL be empty

### Requirement: A row action can apply to some files only

A host row action SHALL accept `visibleIf` with `extension` (a list of extensions, compared without case, a leading dot allowed) and `mime` (a list of mime types, where one ending in `/` or `/*` matches the family). The action SHALL be offered on a file only when every condition named holds. A row action without `visibleIf` SHALL be offered on every file.

#### Scenario: Read as a message on saved mail only
- **GIVEN** a row action with `visibleIf: { extension: ['eml', 'msg'] }`
- **WHEN** the folder holds `report.pdf` and `Reply.EML`
- **THEN** the action SHALL be in the menu of `Reply.EML`
- **AND** it SHALL NOT be in the menu of `report.pdf`

### Requirement: The browser can select files and run the host's bulk actions

CnFilesBrowser SHALL accept `bulkActions`, declared like row actions. With at least one, every file row (never a folder or a linked row) SHALL carry a checkbox named after the file, the header SHALL carry a select-all checkbox, and while one or more files are selected a bar SHALL show how many and one button per bulk action plus Clear selection. An `open-modal` bulk action SHALL be dispatched with `files` (each `{ fileId, fileName, path }`) and `fileIds` merged into its props; a `handler` bulk action SHALL get the selected nodes appended to its args. The selection SHALL clear after a dispatch and when the browser opens another folder. Without `bulkActions` there SHALL be no checkbox column.

#### Scenario: Mark two documents final
- **GIVEN** a browser with a bulk action Mark as final (`open-modal`)
- **WHEN** the user ticks `a.pdf` and `b.pdf` and activates Mark as final
- **THEN** the modal SHALL be opened with `fileIds` holding both file ids
- **AND** the selection SHALL be empty afterwards

#### Scenario: No bulk actions
- **GIVEN** a browser without `bulkActions`
- **THEN** no row SHALL carry a checkbox

### Requirement: The browser can group and filter files on a declared column

CnFilesBrowser SHALL accept `groupBy` (the key of a declared column) and `facets` (keys of declared columns). With `groupBy`, the files SHALL be listed under a heading row per value, in first-seen order, each heading with the number of files under it; files without a value SHALL come last under `groupEmptyLabel`; folders SHALL stay above the groups. With `facets`, the browser SHALL show, per facet, a toggle chip per value in use among the folder's files (list values counted per entry) with its count; selecting chips SHALL keep the files matching any selected value of a facet and all facets with a selection; Clear filters SHALL drop them; when the filter matches no file the browser SHALL say so. Without either the table SHALL render as before.

#### Scenario: Grouped by document type
- **GIVEN** `groupBy: 'type'` over a row column with values Besluit, Brief, Besluit
- **THEN** a heading "Besluit 2" SHALL precede two files and "Brief 1" one

#### Scenario: Filter on keywords
- **GIVEN** `facets: ['keywords']` and files tagged `[bezwaar]`, `[bezwaar, advies]` and `[]`
- **THEN** the chips SHALL read "bezwaar 2" and "advies 1"
- **WHEN** the user selects "advies"
- **THEN** one file SHALL remain
