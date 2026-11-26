---
kind: code
depends_on: [map-image-layer]
---

# An image map takes its picture from the record

## Why
larpinq `worlds-maps` task 2.2 draws a world map with its pins: one map object per picture (`image` file, `width`, `height` in pixels) and pins in pixels. The image layer (map-image-layer) takes a literal `url`, `width` and `height`, and a `type: "map"` page cannot read them from the routed object (`@route.<param>` replaces whole strings only). A detail page already hands its `map` widget the record and resolves `@object.<field>` in the markers' filter, but not in the image layer.

## What changes
In `CnMapWidget`, an `image` layer's `url`, `width` and `height` may be `@objectId` / `@object.<path>` tokens, resolved against the record the widget sits on. A file property gives its `downloadUrl`, `accessUrl` or `url`. While a token has no value the map waits instead of opening as a geographic map; a new record's picture re-renders the layer. Literal layers behave as before. No schema change: the map-page rule (map-image-layer) still asks a `type: "map"` page for literal sizes.

## Rows and halves

| requesting repo | requesting change | half |
|---|---|---|
| larpinq | worlds-maps | the map object's own picture on its detail page |
