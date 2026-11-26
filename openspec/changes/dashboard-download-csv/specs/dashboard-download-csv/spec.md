# dashboard-download-csv Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-download-csv](../../)

## ADDED Requirements

### Requirement: A dashboard can be downloaded as CSV

A dashboard page with `download: true` SHALL show a "Download" button in its header that is disabled until the page has
loaded and the figures are read, and that saves `<downloadName>-<yyyy-mm-dd>.csv` with the header row
`widget,label,value`: one row per stat tile with an OpenRegister source (its label and count), one row per group of a
chart that counts per `groupBy`, and one row per record of an object table (its columns joined as the label). A widget
whose read fails SHALL write one row with the value `error`. The file SHALL be UTF-8 with a byte order mark, comma
separated, with a cell quoted when it holds a comma, a quote or a line break. Without `download` the page SHALL offer
no button and read nothing extra.

#### Scenario: A report is saved for a spreadsheet

- **GIVEN** a dashboard with `download: true`, `downloadName: "buildiq-applications"`, a stat tile "Published" counting 5 and a donut "By status" with published 5 and draft 2
- **WHEN** the figures are read and the reader presses Download
- **THEN** `buildiq-applications-<today>.csv` holds `Published,Published,5`, `By status,published,5` and `By status,draft,2` under `widget,label,value`

#### Scenario: Download waits for the figures

- **GIVEN** a dashboard with `download: true` whose OpenRegister reads are still running
- **THEN** Download is disabled, and it is enabled once they have answered
