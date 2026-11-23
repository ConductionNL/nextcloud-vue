# files-preview Specification

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [files-preview-in-place](../../)

## Purpose

Every files component opens a file the same way, and data files are
previewed in the page. Row `pub-preview` (opencatalogi matrix).

## ADDED Requirements

### Requirement: Every files component opens a file the same way

`CnFilesTab`, `CnFilesCard`, `CnFilesWidget` and `CnRelatedFiles` SHALL
open a file through one opener that tries, in order: Nextcloud's Viewer
when it is loaded and handles the type; `CnFilePreview` when it renders
the type; the browser in a new tab for PDF and images, through a URL
validated by `safeHref`; the Files app permalink. `CnFilesCard` SHALL
NOT render a bare link as its only way to open a file.

#### Scenario: A reader opens a PDF from the publication page

- GIVEN a publication detail page with the files integration widget and the Viewer loaded
- WHEN a reader clicks "Besluit.pdf"
- THEN the PDF opens in the Viewer over the page
- AND the reader is still on the publication

#### Scenario: The widget no longer sends the reader away

- GIVEN a `CnFilesWidget` listing "Begroting 2026.pdf"
- WHEN the reader clicks it on a page with the Viewer loaded
- THEN it opens in the Viewer, not in a new Files tab

### Requirement: A data file is previewed in the page

`CnFilePreview` SHALL render CSV and TSV files as a table of their first
100 rows with the first row as header, JSON as a read-only formatted
view, and XML and plain text as formatted text, fetching at most the
first megabyte. It SHALL offer Download and Open in Files. A file that
cannot be parsed SHALL show its raw text with a sentence saying so. Cell
content SHALL be rendered as text, never as HTML.

#### Scenario: A reader checks a dataset before downloading

- GIVEN a publication with the attachment "Afvalinzameling 2025.csv" of 40,000 rows
- WHEN a reader clicks it
- THEN a preview shows the header and the first 100 rows
- AND says it shows 100 of about 40,000 rows
- AND offers Download

#### Scenario: A malformed CSV still shows

- GIVEN a CSV with unbalanced quotes
- WHEN it is previewed
- THEN the raw text is shown with the sentence that it could not be read as a table

### Requirement: Public pages preview without the Viewer

On a page rendered by the public runtime, where the Viewer is not
loaded, PDFs and images SHALL open in the browser's own viewer and data
files in `CnFilePreview`, using the public download URL OpenRegister
gives a published file.

#### Scenario: A resident previews a published CSV

- GIVEN a public publication page with a published CSV
- WHEN a resident without a Nextcloud account clicks it
- THEN the preview shows its first rows
