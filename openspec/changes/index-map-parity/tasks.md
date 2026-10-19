# Tasks: index-map-parity

### Task 1: Marker colour from a field
- **spec_ref**: `openspec/changes/index-map-parity/specs/index-page/spec.md#requirement-a-marker-can-take-its-colour-from-a-field`
- **files**: `src/utils/mapMarkerColor.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnMapWidget/CnMapWidget.vue`
- [x] Implement: `mapConfig.markerColor`, with a reference source
- [x] Test: `tests/utils/mapMarkerColor.spec.js`, `tests/components/CnIndexPageMapParity.spec.js`

### Task 2: Plot every matching row
- **spec_ref**: `openspec/changes/index-map-parity/specs/index-page/spec.md#requirement-the-map-can-plot-every-matching-row`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: `mapConfig.plotAll`, page size raised on the map and restored after, a note at the limit
- [x] Test: `tests/components/CnIndexPageMapParity.spec.js`

### Task 3: The count line
- **spec_ref**: `openspec/changes/index-map-parity/specs/index-page/spec.md#requirement-the-map-can-say-how-many-rows-it-placed`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: `mapConfig.count`
- [x] Test: `tests/components/CnIndexPageMapParity.spec.js`
