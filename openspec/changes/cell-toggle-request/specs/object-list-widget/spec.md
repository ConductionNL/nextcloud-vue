# object-list-widget Delta

## ADDED Requirements

### Requirement: A column can toggle a value through an endpoint

A column with `toggle` SHALL draw a switch cell that sends `{ [bodyKey]: on }` to the toggle's url, the row's `{field}`
and the page's `@objectId` filled in. With `updatesRecord` the answer SHALL become the page's record, and the cell SHALL
be read only while the record cannot be edited. A refused write SHALL put the cell back.

#### Scenario: Ticking a field into the case list

- **GIVEN** the fields table of case type ct-1 with a toggle on "In the list"
- **WHEN** the reader ticks Welstandsgebied
- **THEN** the list sends `{ "shown": true }` to `/apps/dossiq/api/case-types/ct-1/list-columns/welstandsgebied` and the page takes over the case type it answers

#### Scenario: A reader who cannot edit the case type

- **GIVEN** the page record cannot be edited
- **WHEN** the fields table draws "In the list"
- **THEN** each checkbox shows its state and cannot be changed
