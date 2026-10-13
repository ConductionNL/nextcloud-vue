# Tasks: library-css-once-per-page

### Task 1: One stylesheet per page
- **spec_ref**: `openspec/changes/library-css-once-per-page/specs/library-stylesheet/spec.md#requirement-the-library-stylesheet-is-on-a-page-once-the-newest-build-winning`
- **files**: `src/utils/libraryStyle.js`, `rollup.config.js`
- [x] Implement: `installLibraryStyle`, the emitted `dist/esm/library-style.js`, the entry banner
- [x] Test: `tests/utils/libraryStyle.spec.js`; e2e `e2e/l7-library-style.e2e.js` (`?l7=library-style`, both load orders); `scripts/check-library-style.mjs` after the build

### Task 2: Scope ids by source
- **spec_ref**: `openspec/changes/library-css-once-per-page/specs/library-stylesheet/spec.md#requirement-component-scope-ids-follow-the-components-source`
- **files**: `rollup.config.js`
- [x] Implement: `BUILD=production` for rollup-plugin-vue
- [x] Test: `scripts/check-library-style.mjs` (CnObjectListWidget's id is the hash of path + source)
