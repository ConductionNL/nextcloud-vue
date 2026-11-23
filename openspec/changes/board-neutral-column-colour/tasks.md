# Tasks: board-neutral-column-colour

### Task 1: A merged column prefers a chosen colour
- **spec_ref**: `openspec/changes/board-neutral-column-colour/specs/board-view/spec.md#requirement-a-merged-column-prefers-a-chosen-colour`
- **files**: `src/utils/boardReferenceColumns.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `docs/components/cn-index-page.md`
- [x] Implement: `source.neutralColor`, `mergedColumnColor`, schema 2.101.0
- [x] Test: `tests/utils/boardNeutralColumnColour.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`; e2e `e2e/l19-board-neutral-column-colour.e2e.js` (`?l8=board-neutral-colour`)
