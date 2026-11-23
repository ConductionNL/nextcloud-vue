# Tasks: board-column-colour-map

### Task 1: A column colour can be mapped to a CSS colour
- **spec_ref**: `openspec/changes/board-column-colour-map/specs/board-view/spec.md#requirement-a-column-colour-can-be-mapped-to-a-css-colour`
- **files**: `src/utils/boardReferenceColumns.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `docs/components/cn-index-page.md`
- [x] Implement: `source.colorMap`, `mappedColor` after the merge, schema 2.102.0
- [x] Test: `tests/utils/boardColumnColourMap.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`; e2e `e2e/l19-board-column-colour-map.e2e.js` (`?l8=board-colour-map`)
