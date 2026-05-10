# Design: manifest-map-widget

## Goal

Close the "map page" gap in the manifest renderer. Today every
consumer that needs a map (procest `CaseMap`, planned opencatalogi
`Locations`, planned zaakafhandelapp `Cases on map`) falls back to
`type: "custom"` because the lib has no built-in map primitive.

After this change consumers declare:

```json
{
  "id": "CaseMap",
  "route": "/map",
  "type": "map",
  "title": "procest.case_map.title",
  "config": {
    "center": [52.1326, 5.2913],
    "zoom": 7,
    "layers": [
      {
        "type": "tile",
        "url": "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png",
        "options": { "attribution": "© Kadaster", "maxZoom": 19 }
      },
      {
        "type": "wms",
        "url": "https://service.pdok.nl/lv/bag/wms/v2_0",
        "options": { "layers": "pand", "format": "image/png", "transparent": true, "opacity": 0.6 }
      }
    ],
    "markers": {
      "dataSource": { "url": "/index.php/apps/procest/api/cases/geo" },
      "latField": "lat",
      "lngField": "lng",
      "popupField": "title",
      "clustering": true
    },
    "height": "calc(100vh - 200px)"
  }
}
```

…and the library renders the map, mounts the layers, fetches markers,
and handles base-layer switching + clustering through one canonical
component path.

## Page vs. widget — decision

The chart precedent (`manifest-chart-widget`) made charts a
**widget** because charts in production live INSIDE a dashboard grid
(procest's Doorlooptijd has three apexcharts side-by-side with KPI
tiles). The map situation is the opposite: in every observed
consumer the map is the **entire page** (procest `CaseMap` is a
full-screen map with filter chrome at the top; opencatalogi
`Locations` and the planned zaakafhandelapp variant are the same
shape). Mixing maps into a `CnDashboardGrid` cell isn't a
production use-case yet — Leaflet's tile rendering and zoom-on-scroll
behaviour fight gridstack's drag-resize handles, and clustering
needs the full viewport to be useful.

We therefore land **`map` as a page type**, not a widget type:

- `CnPageRenderer`'s `defaultPageTypes` map gains a `map` entry that
  resolves to `CnMapPage`.
- `CnMapPage` composes `CnPageHeader` + a single `CnMapWidget`.
- `CnMapWidget` is the reusable Leaflet primitive — exported from
  the library barrel so a consumer who wants to embed a map inside
  a custom dashboard slot still has the building block. (When a
  second consumer needs that, `widgetDef.type === "map"` lands as a
  follow-up dispatcher branch in `CnDashboardPage` mirroring the
  chart-widget pattern; deferred today because no such consumer
  exists.)

This split — page-type for the manifest happy-path, widget-primitive
for the escape hatch — matches the `CnFilesPage` / `CnFilesPicker`
shape (the page wraps the picker primitive) and keeps the manifest
contract symmetric with the chart-widget posture (props mirror the
component, dispatcher just forwards).

## Component contract — CnMapWidget

### Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `center` | `[number, number]` | yes | — | `[lat, lng]`. Validator rejects non-finite. |
| `zoom` | `Number` | no | `7` | |
| `layers` | `Array<Layer>` | no | `[]` | See **Layer shape** below. |
| `markers` | `Object` | no | `null` | See **Markers shape** below. |
| `clustering` | `Boolean` | no | `false` | Lazy-loads `leaflet.markercluster` on first true value. |
| `height` | `String \| Number` | no | `'500px'` | Forwarded to map container CSS. |
| `autoFit` | `Boolean` | no | `true` | Fit map bounds to all features after first load. |
| `unavailableLabel` | `String` | no | `t('Map library not available')` | Shown when `L` is absent (test envs). |

`Layer` shape (`config.layers[]`):

```js
{
  type: 'tile' | 'wms' | 'wfs' | 'geojson',  // closed enum
  url:  string,                              // required, non-empty
  options: object,                           // free-form Leaflet options
  attribution: string,                       // shorthand, merged into options
  // tile-only:
  // - maxZoom, minZoom, subdomains
  // wms-only:
  // - layers, format, transparent, opacity, version
  // wfs-only:
  // - typeName, srsName, outputFormat (must be GeoJSON for v1)
  // geojson-only:
  // - data: inline FeatureCollection (skips fetch)
}
```

`Markers` shape (`config.markers`):

```js
{
  // pick ONE
  features: Array<GeoJSONFeature>,                   // inline static
  dataSource: { url: string }                        // HTTP fetch — implemented v1
            | { register: string, schema: string },  // OR aggregation — RESERVED, deferred
  latField: 'lat',                                    // when source returns rows, not features
  lngField: 'lng',
  popupField: 'title',                                // optional — string property used as popup HTML
  clustering: true,                                   // overrides widget-level
  iconColor: '#2196F3',
  iconUrl: string,                                    // custom Leaflet icon
}
```

### Events

| Event | Payload | When |
|---|---|---|
| `@map-ready` | `{ map }` | Leaflet instance mounted. Consumer escape hatch. |
| `@marker-click` | `{ feature, latlng }` | Marker tapped. |
| `@bounds-change` | `{ north, south, east, west, zoom }` | After `moveend` (debounced 100ms). |
| `@click` | `{ lat, lng }` | Empty-area click. |

### Slots

| Slot | Scope | Purpose |
|---|---|---|
| `#legend` | `{ layers, markers }` | Custom legend overlay (top-right). |
| `#popup` | `{ feature, properties }` | Override default popup HTML. |
| `#fallback` | — | Shown when `L` unavailable. |

## Component contract — CnMapPage

### Props

| Prop | Type | Notes |
|---|---|---|
| `title` | `String` | Forwarded to `CnPageHeader`. |
| `description` | `String` | ditto |
| `center`, `zoom`, `layers`, `markers`, `height`, `clustering` | as `CnMapWidget` | Forwarded |

### Slots

| Slot | Purpose |
|---|---|
| `#header` | Override `CnPageHeader` (scope: `{ title, description }`). |
| `#filters` | Filter chrome rendered between header and map (procest puts case-type / status / "my cases" toggles here). |
| `#legend` | Pass-through to `CnMapWidget` legend slot. |
| `#popup` | Pass-through to `CnMapWidget` popup slot. |

### Events

`@marker-click`, `@bounds-change`, `@click`, `@map-ready` — pass-through.

## Manifest renderer integration

```js
// src/components/CnPageRenderer/pageTypes.js
export const defaultPageTypes = {
  index:     ...,
  detail:    ...,
  dashboard: ...,
  logs:      ...,
  settings:  ...,
  chat:      ...,
  files:     ...,
  map:       defineAsyncComponent(() => import('../CnMapPage/CnMapPage.vue').then(m => m.default)),
}
```

### Schema delta

`pages[].type` description gains `map` in the enumerated list. The
`config` block keeps `additionalProperties: true` so per-type fields
(`center`, `zoom`, `layers`, `markers`, `height`) stay free-form.

`validateManifest.validateTypeConfig` gains a `'map'` branch:

- `config.center` MUST be a 2-element array of finite numbers
  (`[lat, lng]`). Missing or malformed produces
  `pages[N]/config/center: must be a length-2 array of finite numbers`.
- `config.zoom` (optional) MUST be a finite number.
- `config.layers` (optional) MUST be an array; for each entry,
  `type` ∈ `{tile, wms, wfs, geojson}` and `url` MUST be a non-empty
  string. `geojson` may instead set `data` (inline) without `url`.
- `config.markers.dataSource` (optional, when set) MUST declare
  exactly one of `{ url }` OR `{ register, schema }`.

Unknown keys on `config` round-trip without error (forward-compat).

## Why a direct dependency, not a peer

Chart-widget made `apexcharts` a **peer dependency** because most
consumers already import it directly from `vue-apexcharts`. For
Leaflet:

- Only one consumer (procest) imports it today; the rest of the
  fleet has no `leaflet` in their `package.json`.
- Forcing every consumer to add `leaflet` as a peer just to install
  `@conduction/nextcloud-vue` is a worse trade than carrying ~140 KB
  through dist/. The bundle cost only lands on consumers that
  actually mount a map (Vue's async-component split + rollup's
  tree-shaking keeps the cost off the critical path for non-map
  pages).
- Marker-cluster support stays opt-in via dynamic `import()` from
  inside `CnMapWidget`'s `clustering` watcher — only consumers that
  set `clustering: true` pay for `leaflet.markercluster`.

## Alternatives Considered

1. **`type: "custom"` forever** — Rejected. Defeats the manifest's
   purpose of being declarative and forces every consumer to ship
   the same Leaflet wiring.
2. **`map` as a `widgetDef.type` value (no page wrapper)** — Rejected.
   Maps in production are full-page; gridstack drag-resize fights
   Leaflet pan/zoom; cell-bound clustering is not useful. We export
   `CnMapWidget` standalone for the rare embed case so this path
   stays open if a real consumer asks for it.
3. **Inline `react-leaflet` / `vue-leaflet-map` wrapper** — Rejected.
   `vue2-leaflet` is unmaintained and pinned to old Leaflet
   versions. We wrap Leaflet directly because the surface we need
   (4 layer types, marker clustering, popup HTML, event forwarding)
   is small.
4. **Server-side coordinate reprojection** — Rejected for v1. Apps
   either send WGS84 already (the OR / openconnector default) or
   convert in their data path before posting to the markers
   endpoint. Library-side proj4 is a separate change.

## Consequences

- Apps can drop `type: "custom"` for any map-only page.
- `CnMapWidget` becomes the canonical Leaflet wrapper for the
  fleet. Apps that mount Leaflet directly drift from the standard
  and are surfaced by ADR-029 route-reachability gate's
  manifest-drift check.
- `leaflet` ships in the lib's `dist/` — consumers without a map
  page still pay the bundle cost only when they actually import
  `CnMapPage` / `CnMapWidget` (rollup splits on the async page
  import).
- A future `widgetDef.type === "map"` branch can land cheaply on
  top of the existing `CnMapWidget` primitive when a real consumer
  asks for embedded maps inside a dashboard.
