# Tasks — manifest-runtime-perf

- [x] 1.1 Add `pageById` + `detailPageByRegisterSchema` memoized computeds to CnPageRenderer
  - spec_ref: specs/json-manifest-renderer/spec.md
  - files: src/components/CnPageRenderer/CnPageRenderer.vue
- [x] 1.2 Rewire `currentPage`, index row-click wiring, and `onRowOpen` to the indexes
  - files: src/components/CnPageRenderer/CnPageRenderer.vue
- [x] 2.1 Add the `CnUnknownWidget` placeholder component
  - files: src/components/CnWidgetGrid/CnUnknownWidget.vue
- [x] 2.2 Render the placeholder in CnWidgetGrid instead of silently skipping an unresolved widgetKey
  - files: src/components/CnWidgetGrid/CnWidgetGrid.vue
- [x] 2.3 Update the CnWidgetGrid unknown-widgetKey test to the placeholder contract
  - files: tests/components/CnWidgetGrid.spec.js

Acceptance criteria:
- CnPageRenderer + CnWidgetGrid suites green (132/132)
- The index maps rebuild only on manifest change (Vue computed cache)
- An unresolved widget renders a labelled placeholder, page never blanks
- Library builds clean
