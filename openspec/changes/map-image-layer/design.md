# Design: map-image-layer

Read at nextcloud-vue development `c8aa85863`.

## What is there

- `CnMapWidget` (`src/components/CnMapWidget/CnMapWidget.vue`) creates
  `L.map(el, { center, zoom, zoomControl, attributionControl })` (`:556`)
  on Leaflet's default CRS, and adds layers from `ALLOWED_LAYER_TYPES =
  ['tile', 'wms', 'wfs', 'geojson']` (`:93`, `:672-704`); an unknown type
  is skipped with a warning. A map click emits
  `{ lat: e.latlng.lat, lng: e.latlng.lng }` (`:580`).
- Markers come from inline features or a `dataSource.url` with
  `latField`, `lngField` and `popupField`.
- `CnMapPage` passes `config.{center, zoom, layers, markers, height,
  clustering, autoFit}` through.

## Decisions

### D1. An image layer switches the map to flat coordinates

When `layers` holds a layer of type `image`, the widget creates the map
with `crs: L.CRS.Simple` and adds `L.imageOverlay(url, bounds)` with
bounds `[[-height, 0], [0, width]]`. Pixel `(x, y)` from the top left
maps to `L.latLng(-y, x)`, so y runs down on screen as it does in the
image. The conversion lives in one pair of helpers, `toImagePoint` and
`fromImagePoint`, used by markers and clicks alike. Any other layer
beside an image layer is skipped with a warning (out of scope).

Rejected: a separate `CnImageMapWidget`. Pins, popups, clustering and
the data source are the same code; only the projection differs.

### D2. Markers read `xField` and `yField`

On an image map, markers read `xField` and `yField` (default `x` and
`y`) instead of `latField` and `lngField`. A row without both numbers is
not plotted and is counted in a small "N places have no position" note.

### D3. Clicks answer in pixels

On an image map the `click` event carries `{ x, y }`, rounded to whole
pixels and clamped to the picture. larpinq's "Add pin here" opens the pin
form with those two numbers filled in.

### D4. The picture stays in view

On open the map fits the image bounds. `maxBounds` is the image bounds
padded by 10 percent, so a drag cannot lose the picture. Zoom runs from
fitting the whole picture to four times its native size.

## Files

- `src/components/CnMapWidget/CnMapWidget.vue`: the layer, the CRS
  switch, markers, click, bounds.
- `src/components/CnMapWidget/imageCoordinates.js`: new helpers.
- `src/components/CnMapPage/CnMapPage.vue`: pass-through.
- `src/schemas/app-manifest-v2.schema.json`: `image` in the layer type
  enum with `width` and `height` required, and `xField`, `yField` on
  markers.

## Security

The image URL is passed through `safeHref` before use, which the other
layer types do not do today. The widget does not fetch it; the browser
loads it as an image, so a non-image URL shows nothing rather than
running anything.

## Accessibility

The map keeps its existing text alternative: the marker list below the
map, which now lists places by label with their position.
