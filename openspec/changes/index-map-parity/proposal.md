---
kind: code
---

# Proposal: index-map-parity

## Summary

dossiq retired its own case map page (CasesOnMapView) for the Cases index in map view. That page did three things the index map did not: it coloured markers by status, it plotted every located case rather than one page, and it said how many cases it placed. Each is a configuration key on `mapConfig`, so no app needs its own map page for them.

## Scope

- `src/utils/mapMarkerColor.js`: the colour of a marker from a field of its row, directly or through a referenced row.
- `src/components/CnIndexPage/CnIndexPage.vue`: `mapConfig.markerColor`, `mapConfig.plotAll` (page size raised while the map is open, restored on leaving, a note when the limit is hit) and `mapConfig.count`.
- `src/components/CnMapWidget/CnMapWidget.vue`: a numbered pin takes the marker colour.
- Manifest schema, docs, en/nl strings.
