# files-column-subline Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [files-column-subline](../../)

## Purpose

A files-browser column can say why a value is what it is on a second line under it.

## ADDED Requirements

### Requirement: A declared column can draw a second line under its value

A CnFilesBrowser column declared with `subline` SHALL draw that template, translated and filled from the file's
`rowData` entry, as a muted 12px line 3px under the cell's value. A template whose tokens name no value SHALL draw
nothing, and a column without `subline` SHALL render as before.

#### Scenario: DqZaakDocumenten cites a ground under a verdict

- **GIVEN** the Assessment column with `subline: "ground {reviewGrounds|values}"`
- **AND** a file whose row data holds `reviewVerdict: deels_openbaar` and `reviewGrounds: ["5.1.2.e"]`
- **THEN** its cell shows the "Deels openbaar" pill with "grond 5.1.2.e" under it

#### Scenario: A file without a cited ground

- **GIVEN** the same column and a file whose `reviewGrounds` is empty
- **THEN** its cell shows the pill alone
