# Tasks: map-image-from-record

> Sibling half of larpinq `worlds-maps` 2.2. `kind: code`.

### Task 1: Resolve the image layer against the record
- **spec_ref**: `openspec/changes/map-image-from-record/specs/manifest-map-widget/spec.md#requirement-an-image-layer-can-take-its-picture-from-the-record`
- **files**: `src/components/CnMapWidget/imageLayerSource.js`, `src/components/CnMapWidget/CnMapWidget.vue`, `tests/components/imageLayerSource.spec.js`, `tests/components/CnMapWidgetImageFromRecord.spec.js`, `docs/components/cn-map-widget.md`
- **acceptance_criteria**:
  - tokens resolve, a file gives its URL, the map waits while pending and re-renders on a new picture; literal layers unchanged
  - Verify: jest
- [x] Implement
- [x] Test
