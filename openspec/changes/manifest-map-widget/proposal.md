# Proposal: manifest-map-widget

## Summary

Add a declarative `map` page primitive to `CnPageRenderer`'s page-type
registry so a manifest-driven app can render a Leaflet map with WMS,
WFS, tile and GeoJSON overlays via `pages[{ type: "map", config: {
center, zoom, layers, markers? } }]` with no consumer-side component
code. Today every consumer that needs a map (procest `CaseMap`, future
opencatalogi `Locations`, future zaakafhandelapp `Cases on map`) pins
that route to `type: "custom"` because the lib has no map primitive.

## Motivation

ADR-024 closed the page-level `type` enum to a curated set
(`index | detail | dashboard | logs | settings | chat | files | custom`)
and explicitly notes that further built-in types must land via a
library-level openspec change. The fleet has one production
custom-fallback site that fits this contract exactly:

- **procest `CaseMap` (Leaflet + PDOK + WMS/WFS overlays)** — a
  315-line `CaseMapView.vue` that mounts `CaseMap.vue` (424 lines)
  with PDOK BRT tiles, WMS overlays, marker clustering, and a status
  legend. To go manifest-driven the page would have to declare
  `type: "custom"` and ship a custom Vue file, defeating the manifest.

A `type: "map"` page unblocks this: the manifest declares
`{ type: "map", config: { center, zoom, layers, markers } }` and
`CnPageRenderer` mounts a new `CnMapPage` (wrapping a reusable
`CnMapWidget` primitive) without any per-app glue.

The lib v2 backlog row in ADR-024's "Consequences" / app-manifest
extensions discussion captures this as **map widget primitive
(Leaflet + WMS/WFS) — procest CaseMap, opencatalogi Locations**.

## Affected Projects

- [x] Project: `nextcloud-vue` — Add a new `CnMapWidget` primitive
      (Leaflet wrapper) and a thin `CnMapPage` component; register
      `map` in `defaultPageTypes`; extend the manifest schema's
      `pages[].type` enum and `validateManifest` per-type rules; tests
      and docs.
- [x] Project: `procest` — Convert the `CaseMap` route from
      `type: "custom"` to `type: "map"` in `src/manifest.json`. Drop
      `CaseMapView.vue` from `customComponents.js` (the underlying
      `CaseMap.vue` and `MapLegend.vue` stay as primitives reused by
      consumers that need extra UI on top of the page; for the
      first migration, the route renders directly through
      `CnMapPage`).

## Scope

### In Scope

- **Component**: `CnMapWidget` — Leaflet wrapper that consumes a
  declarative `{ center, zoom, layers, markers }` shape and renders
  base + overlay layers + GeoJSON / marker clusters. Reusable as a
  library primitive (any consumer can `<CnMapWidget v-bind="props"/>`
  outside the manifest path).
- **Component**: `CnMapPage` — thin page-shell wrapper that mounts
  `CnPageHeader` plus `CnMapWidget` and forwards `marker-click` /
  `bounds-change` events. The page is what the manifest renderer
  resolves for `type: "map"` entries.
- **Page-type wiring**: `defaultPageTypes` gains a `map` entry that
  async-imports `CnMapPage`.
- **Schema delta**: `pages[].type` enum description updated to
  enumerate `map`; `validateManifest` gains a `'map'` branch
  enforcing `config.center` (length-2 array of finite numbers) and
  closed-enum constraints on `config.layers[].type` and
  `config.markers.dataSource`.
- **Direct dependency**: `leaflet` is added as a direct dependency.
  The chart-widget precedent left `apexcharts` as a peer because
  most consumers already import it; for Leaflet only procest does
  today, and forcing peer-dep installation on every consumer that
  doesn't render a map is a worse trade than carrying ~140kB
  through dist/. (Tree-shaking via the per-component import keeps
  consumers that don't render a map from paying the cost.)
- **Tests**: Component tests for `CnMapWidget` (layer dispatch,
  marker rendering, GeoJSON resolution), `CnMapPage` (manifest-shape
  consumption, slot fallthrough, event forwarding), `CnPageRenderer`
  (`map` type resolves to `CnMapPage`), and `validateManifest`
  (config shape errors).

### Out of Scope (for this change)

- **Drawing / spatial-filter UI** — procest's `SpatialFilter` (lasso /
  polygon draw) and the case-specific status legend stay in procest.
  They aren't representable as a static manifest config; a future
  change can add `config.tools: ["draw", "filter"]` if a second
  consumer asks for it.
- **OpenRegister `register+schema` data resolver for markers** — the
  schema reserves `markers.dataSource: { register, schema }` but the
  page resolver lands in a follow-up. v1 only resolves
  `markers.dataSource: { url }` (plain HTTP fetch returning GeoJSON
  features) plus inline `markers.features[]` arrays for static maps.
- **Coordinate-system reprojection** — base layers are assumed to
  serve EPSG:3857 (web Mercator) tiles. RD (EPSG:28992) source
  geometries are auto-converted to WGS84 only via the consumer's
  `config.markers.crs` hint, mirroring the procest `ensureWgs84`
  helper. A library-side `coordinateService` is a separate change.
- **Drawing tools** — Leaflet's `Draw` plugin and turf.js
  point-in-polygon helpers stay in procest.

## Problem

Without a `type: "map"` page primitive, every consumer with a map
surface ships:

- A bespoke `*MapView.vue` component (315+ lines in procest, mostly
  filter chrome — the actual Leaflet logic is reusable).
- Direct imports of `leaflet` and `leaflet.markercluster` plus the
  webpack icon-path workaround.
- Manual base-layer registration (PDOK BRT, BRT-grijs, luchtfoto in
  procest) instead of a declarative `layers[]` list.
- A `customComponents.js` registration that duplicates the page's
  identity (route name + manifest entry already say "this is the map
  route").

Three fleet apps will hit this gap as they adopt the manifest:

1. **procest `CaseMap`** (today, 1 route)
2. **opencatalogi `Locations`** (planned, 1 route — venue / dataset
   geographic distribution)
3. **zaakafhandelapp `Cases on map`** (planned, 1 route — same shape
   as procest; one-app-vs-the-other choice deferred)

## Proposed Solution

1. New `CnMapWidget` component wraps Leaflet. Props mirror the
   manifest shape (`center: [lat, lng]`, `zoom: number`,
   `layers: Array<{ type: 'tile'|'wms'|'wfs'|'geojson', url, options }>`,
   `markers?: { features?, dataSource?, latField?, lngField?, popupField? }`,
   plus `clustering`, `height`, `autoFit`). Layer dispatch picks
   `L.tileLayer | L.tileLayer.wms | L.geoJSON | <fetch then geoJSON>`
   per `layer.type`. Unknown types log a `console.warn` and are
   skipped (matches the chart-widget unknown-`chartKind` posture).
2. New `CnMapPage` component composes `CnPageHeader` + `CnMapWidget`,
   reads from `pages[].config`, and exposes the same scoped slots
   the page family conventions ship (`#header`, `#actions`,
   `#map-popup`).
3. `CnPageRenderer`'s `defaultPageTypes` map gains a `map: ...` entry.
   Schema description on `pages[].type` enumerates the new value.
4. `validateManifest`'s `validateTypeConfig` gains a `'map'` branch:
   `config.center` MUST be a length-2 array of finite numbers,
   `config.zoom` (when set) MUST be a finite number,
   `config.layers[]` MUST be an array, each layer MUST have
   `type` ∈ `{tile, wms, wfs, geojson}` and a non-empty `url`.
   `config.markers.dataSource` (when set) MUST declare exactly one of
   `url | (register + schema)`.
5. `package.json` gains `leaflet` as a direct dependency
   (`^1.9.0`). Marker-cluster support stays opt-in via
   `clustering: true` and lazy-loads `leaflet.markercluster` ONLY
   when first consumed by a widget instance — keeping non-clustering
   consumers off the cluster bundle.

## Out of scope (full list, for clarity)

- Drawing / spatial-filter UI (`SpatialFilter`)
- OpenRegister `register+schema` resolver for markers
- Server-side coordinate reprojection (RD ↔ WGS84) baked into the lib
- Map-print, heat-map, vector-tile rendering

## See also

- `nextcloud-vue/openspec/changes/manifest-page-type-extensions/specs/manifest-page-type-extensions/spec.md`
  — parent change that introduced `defaultPageTypes` extension.
- `nextcloud-vue/openspec/changes/manifest-chart-widget/proposal.md`
  — sister widget change; this proposal mirrors its dispatcher
  posture (manifest-shape v-bind, unknown values warn-and-skip,
  reserved `dataSource` round-tripped).
- `procest/src/views/CaseMapView.vue` — the immediate consumer; the
  315-line custom-fallback this change collapses to a
  manifest-driven page.
- `procest/src/components/map/CaseMap.vue` — the underlying Leaflet
  primitive procest already has; the CnMapWidget design lifts its
  layer-dispatch and clustering posture.
- ADR-024 — fleet-wide app-manifest convention; states that new
  `type` enum values require a library-level openspec change (this
  one).
