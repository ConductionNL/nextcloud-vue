# index-page Delta: index-map-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-map-parity](../../)

## Purpose

Let an index page's map view do what an app's own map page did: colour markers by a field, plot every matching row, and say how many rows it placed.

## ADDED Requirements

### Requirement: A marker can take its colour from a field

With `mapConfig.markerColor: { field, colorMap?, source?, default? }` CnIndexPage SHALL colour each marker by the row's `field`. Without `source` the value SHALL be looked up in `colorMap`. With `source` the value SHALL be read as a reference, and the referenced row's `source.colorField` SHALL be the colour, or the key `colorMap` maps to one. A value nothing maps to SHALL get `default`, else the map's own colour.

#### Scenario: Cases coloured by their status type

- **GIVEN** `markerColor: { field: "status", source: { schema: "statusType", colorField: "colour" }, colorMap: { "blue": "#0b71ab" } }` and a case whose status references a status type with `colour: "blue"`
- **WHEN** the map view renders
- **THEN** that case's marker is drawn in `#0b71ab`

### Requirement: The map can plot every matching row

With `mapConfig.plotAll` (`true` for 500, or a number) CnIndexPage SHALL load the rows that match the filters at that page size while the map view is open, and SHALL restore the previous page size when the reader leaves the map. When more rows match than were loaded, a note under the map SHALL say how many are shown of how many.

#### Scenario: More cases than the limit

- **GIVEN** `plotAll: 500` and 620 cases that match the filters
- **WHEN** the map view opens
- **THEN** 500 rows are loaded and the note says the map shows the first 500 of 620

### Requirement: The map can say how many rows it placed

With `mapConfig.count` CnIndexPage SHALL draw a line under the map with the number of rows it placed and the number that match: "Showing {located} of {total} located" for `true`, or the configured template through the host's translate.

#### Scenario: Two of three cases have a location

- **GIVEN** `count: true` and three matching rows, two of them with a geometry
- **WHEN** the map view renders
- **THEN** the line reads "Showing 2 of 3 located"
