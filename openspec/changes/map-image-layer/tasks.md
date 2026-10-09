# Tasks: map-image-layer

> Sibling half of larpinq `worlds-maps`. `kind: code`.
> Checkbox budget: 4 tasks x 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Pixel helpers
- **spec_ref**: `openspec/changes/map-image-layer/specs/manifest-map-widget/spec.md#requirement-markers-on-an-image-map-are-placed-by-pixel`
- **files**: `src/components/CnMapWidget/imageCoordinates.js`, `tests/components/imageCoordinates.spec.js`
- **acceptance_criteria**:
  - `toImagePoint` and `fromImagePoint` round-trip; clamping keeps a click inside the picture
  - Verify: jest
- [x] Implement
- [x] Test

### Task 2: The image layer and the CRS switch
- **spec_ref**: `openspec/changes/map-image-layer/specs/manifest-map-widget/spec.md#requirement-an-image-layer-shows-a-picture-in-flat-coordinates`
- **files**: `src/components/CnMapWidget/CnMapWidget.vue`, `tests/components/CnMapWidgetImage.spec.js`
- **acceptance_criteria**:
  - An image layer creates the map with `L.CRS.Simple`, adds the overlay, fits and bounds it; other layers beside it are skipped with a warning
  - Verify: jest with a mocked Leaflet asserting the options; mutation check: dropping the CRS switch reddens the test
- [x] Implement
- [x] Test

### Task 3: Markers and clicks in pixels
- **spec_ref**: `openspec/changes/map-image-layer/specs/manifest-map-widget/spec.md#requirement-a-click-on-an-image-map-answers-in-pixels`
- **files**: `src/components/CnMapWidget/CnMapWidget.vue`, `e2e/map-image-layer.e2e.js`
- **acceptance_criteria**:
  - `xField` and `yField` place markers; unplottable rows are counted; `click` emits `{ x, y }` on an image map and `{ lat, lng }` otherwise
  - Verify: Playwright on the harness clicks a known pixel and reads the event, and zooms to check a pin stays put
- [x] Implement
- [ ] Test — not run: needs the harness and Playwright (clicks and zoom are asserted against a mocked Leaflet in jest)

### Task 4: Manifest schema and docs
- **spec_ref**: `openspec/changes/map-image-layer/specs/manifest-map-widget/spec.md#requirement-an-image-layer-shows-a-picture-in-flat-coordinates`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `tests/schemas/mapImageLayer.spec.js`, `docs/components/cn-map-widget.md`, `docs/components/cn-map-page.md`
- **acceptance_criteria**:
  - The v2 schema accepts the image layer with `width` and `height` required, and `xField`, `yField`
  - Verify: `npm run build:validators`, `npm run check:docs`, `npm run check:docs-fresh`
- [x] Implement
- [x] Test
