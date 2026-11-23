## ADDED Requirements

### Requirement: A map can narrow its objects to an area

A CnMapWidget whose markers come from an OpenRegister register and schema SHALL send `markers.dataSource.spatialFilter`
to OpenRegister's geo filters: `{ bbox: [w, s, e, n] }` as `geo.bbox`, `{ near: [lon, lat], radius }` as `geo.near` and
`geo.radius`, and `{ within: <Polygon|MultiPolygon> }` as a `geo-search` POST body. It SHALL send `markers.geoProperty`
as `geo.property`, SHALL NOT send a filter it cannot read, and SHALL read the markers again when the filter changes.

#### Scenario: objects in a bounding box
- **GIVEN** a map over register `r`, schema `s` with `spatialFilter: { bbox: [5, 52, 6, 53] }`
- **WHEN** the map loads its markers
- **THEN** it requests `/apps/openregister/api/objects/r/s` with `geo.bbox=5,52,6,53`

#### Scenario: objects in a polygon
- **GIVEN** a map with `spatialFilter: { within: <Polygon> }` and `geoProperty: "grenzen"`
- **WHEN** the map loads its markers
- **THEN** it posts `{ geometry: { within: <Polygon> }, property: "grenzen" }` to `…/geo-search`

### Requirement: A clicked object opens its detail page

A CnMapWidget SHALL open a clicked object's address in a new tab (`noopener`): `markers.detailLink` filled from the
object, else a `url` the object carries. It SHALL open nothing when a token cannot be filled or the address has an
unsafe scheme, and SHALL emit `marker-click` either way.

#### Scenario: a case on the map
- **GIVEN** a map with `detailLink: "/apps/x/{id}"` and an object whose `@self.id` is `abc`
- **WHEN** the reader clicks its marker
- **THEN** `/apps/x/abc` opens in a new tab
