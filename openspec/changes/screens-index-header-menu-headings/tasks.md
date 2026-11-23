# Tasks: screens-index-header-menu-headings

### Task 1: Headings and separators in the header Actions menu
- **spec_ref**: `openspec/changes/screens-index-header-menu-headings/specs/index-header/spec.md#requirement-the-header-actions-menu-can-draw-group-headings-and-separators`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/css/index-page.css`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `{ heading }` and `separator` in `headerButtons[].items`, `groupMenuEntries` (schema 2.93.0)
- [x] Test: `tests/components/CnIndexPageHeaderMenuHeadings.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`; e2e `e2e/l9-header-menu-headings.e2e.js`
