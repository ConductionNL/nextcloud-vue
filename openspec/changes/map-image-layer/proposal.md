---
kind: code
depends_on: []
---

# Proposal: map-image-layer

## Why

Not every map is the earth. A game world, a festival terrain, a
building's floor plan and a campus drawing are pictures with places on
them. People want to put pins on the picture and click a pin to read
about the place. `CnMapWidget` draws geographic maps only: tiles, WMS,
WFS and GeoJSON on Leaflet's web Mercator projection. A picture on those
coordinates is stretched and its pins drift as you zoom.

## Rows

No gap row in this lane's list names this. The sibling change waiting
on it:

- larpinq `worlds-maps`, REQ-WMP-002 "The map shows its pins". Its
  proposal lists "Project: `nextcloud-vue` (not specified here): an
  `image` layer type with a flat, non-geographic coordinate system in
  `CnMapWidget`, so `type: "map"` pages can show a picture instead of
  tiles", and its design D2 describes the layer as
  `{"type": "image", "url": <the map's image>, "width", "height"}` with
  markers from `x` and `y` in pixels from the top left. Design D3 needs
  "a click position on an image layer" so a game master can add a pin
  there.

## What changes

- `CnMapWidget` accepts a layer `{ type: "image", url, width, height }`.
  A map with an image layer uses flat pixel coordinates: `(0, 0)` is the
  picture's top left, `x` runs right, `y` runs down.
- Markers on such a map read `xField` and `yField` from their rows.
- A click on an image map emits `{ x, y }` in the picture's pixels.
- The view fits the whole picture on open, and cannot be panned far off
  it.
- `type: "map"` pages accept the same layer through the manifest.

## Affected projects

- `nextcloud-vue`: `CnMapWidget`, `CnMapPage`, the manifest v2 schema.
- Consumers: larpinq (world maps), and any app with floor plans or
  terrain drawings.

## Backward compatibility

The layer type is new. A map without an image layer is geographic
exactly as before, and its `click` still emits `{ lat, lng }`.

## Out of scope

- Mixing a picture with geographic layers on one map. A map is either a
  picture or the earth.
- Several pictures stacked as floors. One image layer per map.
- Georeferencing a picture onto the earth.
