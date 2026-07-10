## ADDED Requirements

### Requirement: Opt-In Map View Mode

CnIndexPage SHALL support a `map` view mode, available only when the consuming manifest
opts in. The mode MUST be strictly additive: when a page does not opt in, CnIndexPage
behaves exactly as it did with only `table` and `cards`. Opt-in is expressed through the
page `config`: `config.viewModes` (an array listing which of `table` / `cards` / `map`
are offered in the toggle) and/or `config.map` (the geometry mapping block). The default
`viewMode` remains `table`.

#### Scenario: Map mode hidden by default

- **GIVEN** a page whose `config` declares neither `config.map` nor `map` in `config.viewModes`
- **WHEN** CnIndexPage renders the view toggle
- **THEN** no map segment MUST appear in the toggle
- **AND** setting `viewMode='map'` on such a page MUST fall back to the default rendering rather than break

#### Scenario: Map mode offered when opted in

- **GIVEN** a page whose `config.map` is set (e.g. `{ latField, lngField }`) or whose `config.viewModes` includes `'map'`
- **AND** `showViewToggle` is true
- **WHEN** CnIndexPage renders
- **THEN** the CnActionsBar toggle MUST include a third `map` segment
- **AND** selecting it MUST switch `currentViewMode` to `'map'` and emit `@view-mode-change('map')`

### Requirement: Map Plots the Current Filtered Result Set

When `currentViewMode === 'map'`, CnIndexPage SHALL render the existing `CnMapWidget` fed
with markers built inline from the SAME `displayObjects` collection that the table and
card views render. It MUST NOT introduce a new fetch path or a bespoke per-app map
endpoint; the map reuses the existing filter, quick-filter, search, and sidebar
machinery. Applying a filter that changes `displayObjects` MUST correspondingly change the
set of plotted markers.

#### Scenario: One marker per filtered row

- **GIVEN** `viewMode='map'` and `displayObjects` contains N rows with resolvable geometry
- **WHEN** CnIndexPage renders the map
- **THEN** CnMapWidget MUST receive an inline `markers` config (not a `dataSource.url`)
- **AND** the marker collection MUST contain one marker per resolvable row from `displayObjects`
- **AND** CnDataTable and CnCardGrid MUST NOT render

#### Scenario: Filtering updates the markers

- **GIVEN** the map view is showing markers for the current result set
- **WHEN** a sidebar filter, quick-filter, or search reduces `displayObjects`
- **THEN** the plotted markers MUST update to match the new `displayObjects`
- **AND** no additional list fetch MUST be triggered by the map beyond what the filter already performs

### Requirement: Geometry From OpenRegister Object Metadata

Marker geometry SHALL be resolved from OpenRegister object metadata (the geometry OR's
maps-overview leaf already extracts on `@self`), mapped via the opt-in
`config.map: { latField, lngField, geoField, popupField }` block. `latField` / `lngField`
name numeric coordinate properties; `geoField` names a GeoJSON-shaped property when
coordinates are not split into two fields; `popupField` names the property whose value is
shown in the marker popup. Rows without resolvable geometry MUST be skipped without error.

#### Scenario: Lat/Lng field mapping

- **GIVEN** `config.map = { latField: 'latitude', lngField: 'longitude', popupField: 'name' }`
- **WHEN** a row has finite numeric `latitude` and `longitude`
- **THEN** a marker MUST be produced at that coordinate
- **AND** the marker popup MUST show the row's `name` value

#### Scenario: Rows without geometry are skipped

- **GIVEN** `config.map = { latField: 'latitude', lngField: 'longitude' }`
- **WHEN** a row is missing `latitude` or `longitude`, or the values are not finite numbers
- **THEN** that row MUST be omitted from the marker set
- **AND** CnIndexPage MUST NOT throw and MUST still render the remaining markers

### Requirement: Marker Click Navigates Like a Row Click

A marker click SHALL emit the SAME row payload as a table row-click or card click, so that
detail-page navigation is identical across `table`, `cards`, and `map`. CnIndexPage MUST
map the CnMapWidget `@marker-click` payload back to its originating `displayObjects` row
and route it through the existing row-click handler (`@row-click` / `@view`).

#### Scenario: Marker click emits the row object

- **GIVEN** `viewMode='map'` and a marker plotted from a known row
- **WHEN** the user clicks that marker
- **THEN** CnIndexPage MUST emit `@row-click` with the SAME row object the table view emits for that row
- **AND** the emitted payload MUST be identical in shape to a table row-click for the same row
