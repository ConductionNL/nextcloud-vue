# Tasks: screens-index-query-presets

> Query presets with their own lenses, columns and copy (ADR-032 `kind: code`).

## Implementation tasks

### Task 1: Match and apply a preset
- **spec_ref**: `openspec/changes/screens-index-query-presets/specs/index-query-presets/spec.md#requirement-a-query-preset-overlays-lenses-columns-and-copy`
- **files**: `src/utils/queryPresets.js`, `src/components/CnPageRenderer/CnPageRenderer.vue`, `src/schemas/app-manifest-v2.schema.json`, `docs/components/cn-page-renderer.md`, `tests/components/CnPageRendererQueryPresets.spec.js`
- **acceptance_criteria**:
  - All `match` pairs required, first preset wins, repeated parameter matches
  - Only the listed keys replace; `queryPresets` never reaches the page
  - The render key changes with the preset; schema 2.83.0 refuses a preset without `match` or with other keys
- [x] Implement
- [x] Test

### Task 2: DqWooVerzoeken in the app
- **spec_ref**: `openspec/changes/screens-index-query-presets/specs/index-query-presets/spec.md#requirement-a-query-preset-overlays-lenses-columns-and-copy`
- **files**: dossiq `src/manifest.json`
- **acceptance_criteria**:
  - The Woo menu entry shows the board's lenses and columns
- [ ] Implement — not run: app-side, for the dossiq lane after release
- [ ] Test — not run: same reason
