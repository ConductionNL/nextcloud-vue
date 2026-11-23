# A map can narrow its objects to an area, and a clicked object opens its page

## Why
launchpad's `map-support` change asks for spatial filters (bbox, polygon, nearest-N) and click-to-detail on its map
widget. That widget is CnMapWidget, which fetches its own OpenRegister objects, so both belong here: an app cannot add a
filter to a request it does not make, or a click handler to a marker it does not draw.

## What changes
- `markers.dataSource.spatialFilter` on a register source: `{ bbox }` and `{ near, radius }` go to OpenRegister as
  `geo.bbox` and `geo.near` / `geo.radius`, `{ within }` (a polygon) is posted to `…/geo-search`. `markers.geoProperty`
  goes along as `geo.property`. A changed filter reads the markers again. OpenRegister has no nearest-N query, so there
  is none here; a radius with `limit` is the nearest equivalent.
- `markers.detailLink`: a clicked object opens that address (tokens `{id}`, `{register}`, `{schema}`, `{<property>}`)
  in a new tab; without it, a `url` the object carries is opened. `marker-click` is still emitted.
