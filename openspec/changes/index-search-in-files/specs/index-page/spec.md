# index-page Delta: index-search-in-files

## ADDED Requirements

### Requirement: An index page can search inside attached files

`CnIndexPage` SHALL accept `searchInFiles` (default `false`, manifest
`config.searchInFiles`). When true it SHALL render an "Also search inside
files" switch beside the search box. With the switch on and a non-empty
search term, the list query SHALL carry `_content_search=true`; with the
switch off, or no term, it SHALL NOT. The switch state SHALL be kept in the
route query as `contentSearch=1`. With the switch on, the list footer SHALL
say that file matches are limited to the best 50.

#### Scenario: Finding a permit by a word in its attachment

- **GIVEN** an index page with `searchInFiles: true`
- **WHEN** the user switches on Also search inside files and searches "asbest"
- **THEN** the list request SHALL carry `_search=asbest` and `_content_search=true`
- **AND** the route query SHALL carry `contentSearch=1`

#### Scenario: Off by default

- **GIVEN** an index page without `searchInFiles`
- **WHEN** the user searches
- **THEN** no switch SHALL render and the request SHALL carry no `_content_search`

#### Scenario: No term, no widening

- **GIVEN** the switch on and an empty search box
- **WHEN** the list loads
- **THEN** the request SHALL carry no `_content_search`

@e2e include On an index page with searchInFiles, attach a file containing a unique word to a record; search that word with the switch on; assert the record is listed with "Found in" and the file name.

### Requirement: A row found through a file names the file

A row whose `@self.matchedFile` is set SHALL show "Found in {file}" under its
title, with the file name as plain text and no content from the file. A row
without it SHALL render as today.

#### Scenario: The matching file is named

- **GIVEN** a row with `@self.matchedFile: "Inspectierapport.pdf"`
- **WHEN** the list renders
- **THEN** the row SHALL show "Found in Inspectierapport.pdf"

#### Scenario: A field match shows no line

- **GIVEN** a row without `@self.matchedFile`
- **WHEN** the list renders
- **THEN** no Found in line SHALL render
