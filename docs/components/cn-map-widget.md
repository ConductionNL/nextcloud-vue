import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnMapWidget.md'

# CnMapWidget

Leaflet-backed map primitive for declarative manifest-driven maps. Renders a configurable layer stack (tile / WMS / WFS / inline GeoJSON) plus an optional marker set sourced from inline features OR an HTTP `dataSource.url`. Marker clustering is opt-in (lazy-loads `leaflet.markercluster` only when first toggled). Spec: REQ-MMW-* (manifest-map-widget).

## Try it

<Playground component="CnMapWidget" />

## Usage

```vue
<!-- Standalone — embed a map inside a custom component -->
<CnMapWidget
  :center="[52.1326, 5.2913]"
  :zoom="7"
  :layers="[
    { type: 'tile',
      url: 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png',
      options: { attribution: '© Kadaster', maxZoom: 19 } },
    { type: 'wms',
      url: 'https://service.pdok.nl/lv/bag/wms/v2_0',
      options: { layers: 'pand', transparent: true, opacity: 0.6 } },
  ]"
  :markers="{
    dataSource: { url: '/index.php/apps/procest/api/cases/geo' },
    latField: 'lat',
    lngField: 'lng',
    popupField: 'title',
    clustering: true,
  }"
  height="500px"
  @marker-click="onMarkerClick" />
```

The `layers[]` array dispatches by `type`:

| `layer.type` | Leaflet factory                              |
|--------------|----------------------------------------------|
| `tile`       | `L.tileLayer(url, options)`                  |
| `wms`        | `L.tileLayer.wms(url, options)`              |
| `wfs`        | `fetch(url) → L.geoJSON(features, options)`  |
| `geojson`    | inline `data` → `L.geoJSON`; OR fetched URL  |

Unknown types log a warning and are skipped — manifests stay forward-compatible.

## Markers

Pick **one** of:

- `markers.features` — inline GeoJSON `Feature[]` (static maps).
- `markers.dataSource.url` — fetched on mount; the response may be a GeoJSON FeatureCollection OR a flat array of rows (in which case `latField`, `lngField`, `popupField` drive the conversion).
- `markers.dataSource.{register, schema}` — RESERVED. Round-tripped by validators today, resolver lands in a follow-up change.

`markers.clustering: true` (or the widget-level `clustering` prop) opts in to `leaflet.markercluster`. The cluster bundle lazy-loads only when first enabled — consumers without clustering pay zero extra bytes.

## Manifest mounting

Don't mount this component directly from a manifest. Use `CnMapPage` (the `type: "map"` page renderer) which wraps this primitive with a header, filter slot, and event pass-through.

## Fallback

When Leaflet cannot be loaded (test envs, CSP-blocked CDNs), the `#fallback` slot renders instead. Default text uses `unavailableLabel`.

```vue
<CnMapWidget :center="[52, 5]">
  <template #fallback>
    <p>Map view unavailable.</p>
  </template>
</CnMapWidget>
```

## Reference

<GeneratedRef />
