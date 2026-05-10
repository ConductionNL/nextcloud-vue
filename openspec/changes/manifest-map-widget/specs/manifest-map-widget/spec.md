manifest-map-widget
---
status: draft
---
# Manifest map widget / page

## Purpose

Add a declarative `map` page primitive to `CnPageRenderer`'s page-type
registry so a manifest-driven app can render a Leaflet map with WMS,
WFS, tile, and GeoJSON overlays via
`pages[{ type: "map", config: { center, zoom, layers, markers? } }]`
with no consumer-side component code. Closes the audit-driven gap
where procest's `CaseMap` route required `type:"custom"` because no
built-in fit, and unblocks planned opencatalogi `Locations` and
zaakafhandelapp `Cases on map` migrations.

## ADDED Requirements

### Requirement: The schema MUST accept `"map"` as a `pages[].type` value

`src/schemas/app-manifest.schema.json` MUST extend the `pages[].type`
description to include `map` alongside the existing
`index | detail | dashboard | logs | settings | chat | files |
custom`. The schema's `version` field MUST bump from `1.x` to the
next minor (extending an open description, not a closed enum). v1.x
manifests (which don't reference `map`) MUST continue validating
without changes.

#### Scenario: Manifest with `type: "map"` validates
- GIVEN a manifest declaring `pages[0].type = "map"` with
  `config.center = [52.13, 5.29]`, `config.zoom = 7`, and a
  `config.layers` array containing a tile layer with a non-empty `url`
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

#### Scenario: v1.0 manifest still validates against the bumped schema
- GIVEN a manifest using only the existing eight types
- AND `$schema` URL points at the canonical schema
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }` — no new error
  from the schema bump

### Requirement: `map` pages MUST consume a valid `config.center`

A `pages[]` entry with `type: "map"` MUST include `config.center` as
a length-2 array of finite numbers (`[lat, lng]`). Validation MUST
reject map pages with missing, non-array, wrong-length, or non-finite
`center`.

#### Scenario: Valid map page
- GIVEN `{type: "map", config: {center: [52.13, 5.29], zoom: 7}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Invalid — missing center
- GIVEN `{type: "map", config: {zoom: 7}}`
- WHEN validated
- THEN MUST return error
  `pages[N]/config/center: must be a length-2 array of finite numbers`

#### Scenario: Invalid — non-finite center
- GIVEN `{type: "map", config: {center: [NaN, 5.29]}}`
- WHEN validated
- THEN MUST return the same error

#### Scenario: Invalid — wrong-length center
- GIVEN `{type: "map", config: {center: [52.13]}}`
- WHEN validated
- THEN MUST return the same error

### Requirement: `map` pages MUST constrain `config.layers[].type` to a closed enum

When `config.layers` is set, each entry MUST declare `type` ∈
`{tile, wms, wfs, geojson}` and either a non-empty `url` (tile / wms /
wfs / geojson-from-url) or an inline `data` object (geojson only).
Other layer types MUST be rejected by the validator.

#### Scenario: Valid tile layer
- GIVEN a layer `{type: "tile", url: "https://.../{z}/{x}/{y}.png"}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Valid WMS layer
- GIVEN a layer `{type: "wms", url: "https://.../wms",
  options: {layers: "pand"}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Valid inline GeoJSON layer
- GIVEN `{type: "geojson", data: {type: "FeatureCollection", features: []}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Invalid layer type
- GIVEN a layer `{type: "kml", url: "https://.../layer.kml"}`
- WHEN validated
- THEN MUST return error
  `pages[N]/config/layers[0]/type: must be one of tile | wms | wfs | geojson`

#### Scenario: Invalid layer missing url
- GIVEN a layer `{type: "tile"}`
- WHEN validated
- THEN MUST return error
  `pages[N]/config/layers[0]/url: must be a non-empty string`

### Requirement: `markers.dataSource` MUST be exactly one of `{url}` OR `{register, schema}`

When `config.markers.dataSource` is present, it MUST declare exactly
one of `url` (HTTP fetch — implemented in v1) or
`register + schema` (OR aggregation — round-tripped by validator,
resolver deferred to a follow-up). Setting both, or neither when
`features[]` is also absent, MUST be rejected.

#### Scenario: Valid HTTP dataSource
- GIVEN `{markers: {dataSource: {url: "/api/cases/geo"}}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Valid register dataSource (resolver deferred)
- GIVEN `{markers: {dataSource: {register: "procest", schema: "case"}}}`
- WHEN validated
- THEN MUST be valid (resolver behaviour out of scope for this spec;
  manifest still parses and round-trips through validators).

#### Scenario: Invalid — both url and register set
- GIVEN `{markers: {dataSource: {url: "/x", register: "y", schema: "z"}}}`
- WHEN validated
- THEN MUST return error
  `pages[N]/config/markers/dataSource: must declare exactly one of url | (register + schema)`

#### Scenario: Valid inline features[] (no dataSource)
- GIVEN `{markers: {features: [{type: "Feature", geometry: {...}, properties: {}}]}}`
- WHEN validated
- THEN MUST be valid

### Requirement: CnPageRenderer MUST resolve `type: "map"` to CnMapPage

`CnPageRenderer.defaultPageTypes` MUST include a `map` entry that
resolves (asynchronously) to `CnMapPage`. Consumer apps MAY override
this entry by passing `pageTypes={...defaultPageTypes, map: MyMap}`
on `CnAppRoot` / `CnPageRenderer`.

#### Scenario: Manifest-driven dispatch
- GIVEN a manifest with a `type: "map"` page matching the current
  route id
- WHEN `CnPageRenderer` mounts
- THEN it MUST mount `CnMapPage` and forward `pages[].config` as
  props (`center`, `zoom`, `layers`, `markers`, `height`).

#### Scenario: Consumer override
- GIVEN `pageTypes = { ...defaultPageTypes, map: CustomMap }`
- WHEN `CnPageRenderer` mounts a `type: "map"` page
- THEN it MUST mount `CustomMap`, NOT `CnMapPage`.

### Requirement: CnMapWidget MUST render the four declared layer types

`CnMapWidget` MUST consume the `layers[]` array and create one
Leaflet layer per entry, dispatched by `layer.type`:

- `tile` → `L.tileLayer(url, options)`
- `wms` → `L.tileLayer.wms(url, options)`
- `wfs` → fetch `url`, parse response as GeoJSON, mount via
  `L.geoJSON(features, options)`
- `geojson` → either inline `data` (skip fetch) or fetch `url`, then
  `L.geoJSON(features, options)`

Unknown `layer.type` values MUST log a `console.warn` and be
skipped — matching the chart-widget unknown-`chartKind` posture so a
forward-compat manifest never blanks the page.

#### Scenario: Tile layer renders
- GIVEN a widget with one `tile` layer
- WHEN mounted in a Leaflet-capable environment
- THEN one `L.tileLayer` MUST be added to the map.

#### Scenario: WMS layer renders
- GIVEN one `wms` layer with `options.layers = "pand"`
- WHEN mounted
- THEN one `L.tileLayer.wms` MUST be added with the same options.

#### Scenario: Unknown layer type warns and skips
- GIVEN a widget with `[{type: "kml", url: "..."}]`
- WHEN mounted
- THEN `console.warn` MUST fire and no layer MUST be added.

### Requirement: CnMapWidget MUST render markers from features[] OR dataSource.url

`CnMapWidget` MUST render markers from one of:

- `markers.features[]` — inline GeoJSON FeatureCollection
- `markers.dataSource.url` — fetched on mount, expects a JSON
  response that is either a GeoJSON FeatureCollection OR an array of
  flat rows (in which case `markers.latField` / `markers.lngField`
  drive the conversion to point features).

Marker clustering MUST opt-in via `markers.clustering: true` (or
the widget-level `clustering` prop). When clustering is enabled,
`leaflet.markercluster` MUST be lazy-loaded — not bundled with the
critical-path Leaflet primitive — so consumers without clustering do
not pay the cluster bundle cost.

#### Scenario: Inline features render
- GIVEN `markers.features = [Feature1, Feature2]`
- WHEN the widget mounts
- THEN two `L.marker` (or `L.circleMarker`) instances MUST be added
  to the map.

#### Scenario: dataSource.url fetch render
- GIVEN `markers.dataSource.url = "/api/geo"` and the URL responds
  with `{type: "FeatureCollection", features: [...]}`
- WHEN the widget mounts
- THEN the features MUST be added after the fetch resolves.

#### Scenario: dataSource.url with flat rows + latField / lngField
- GIVEN response `[{lat: 52.1, lng: 5.2, title: "A"}, ...]` and
  `latField: "lat"`, `lngField: "lng"`, `popupField: "title"`
- WHEN the widget mounts
- THEN one marker per row MUST be added, with the popup HTML set to
  the `title` value.

#### Scenario: Clustering opt-in lazy-loads markercluster
- GIVEN `clustering: true`
- WHEN the widget mounts
- THEN `leaflet.markercluster` MUST be dynamically imported AND
  marker instances MUST be added to the cluster group.

#### Scenario: Clustering opt-out skips markercluster
- GIVEN `clustering: false` (default)
- WHEN the widget mounts
- THEN `leaflet.markercluster` MUST NOT be imported.

### Requirement: CnMapWidget MUST forward the four documented events

`CnMapWidget` MUST emit:

- `@map-ready`: `{ map }` once Leaflet has finished mounting.
- `@marker-click`: `{ feature, latlng }` on marker tap.
- `@bounds-change`: `{ north, south, east, west, zoom }` on `moveend`,
  debounced 100ms.
- `@click`: `{ lat, lng }` on empty-area click.

#### Scenario: marker-click fires
- GIVEN a feature is clicked
- WHEN the marker layer's click handler fires
- THEN `@marker-click` MUST emit with `{ feature, latlng }`.

### Requirement: CnMapPage MUST forward all CnMapWidget events and pass through manifest-shape props

`CnMapPage` MUST forward `@map-ready`, `@marker-click`,
`@bounds-change`, `@click` from its child `CnMapWidget` to the
parent. It MUST pass `center`, `zoom`, `layers`, `markers`,
`clustering`, and `height` from its own props onto `CnMapWidget`
unchanged. The page-level slots `#header`, `#filters`, `#legend`,
`#popup` MUST work as documented (header overrides `CnPageHeader`;
filters render between header and map; legend/popup pass through to
the widget).

#### Scenario: Event pass-through
- GIVEN a `CnMapPage` mounted with a parent listener for
  `@marker-click`
- WHEN the underlying `CnMapWidget` emits the event
- THEN the parent listener MUST receive the same payload.

#### Scenario: Filters slot renders between header and map
- GIVEN `<CnMapPage><template #filters>...</template></CnMapPage>`
- WHEN mounted
- THEN the slot content MUST appear between the header and the map
  container in the DOM.
