# Tasks: sidebar-column-overrides

### Task 1: A column turned on in the sidebar gets the page's column overrides
- **spec_ref**: `openspec/changes/sidebar-column-overrides/specs/index-page/spec.md#requirement-a-column-turned-on-in-the-sidebar-gets-the-pages-column-overrides`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: `governedColumns` passes `columnOverrides` to `columnsFromSchema`
- [x] Test: `tests/components/CnIndexPageSidebarColumnOverrides.spec.js`

### Task 2: Both column pickers show a column's override label
- **spec_ref**: `openspec/changes/sidebar-column-overrides/specs/index-page/spec.md#requirement-both-column-pickers-show-a-columns-override-label`
- **files**: `src/components/CnIndexSidebar/CnIndexSidebar.vue`, `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: CnIndexSidebar takes `columnOverrides`, and CnIndexPage forwards it to the inline and hoisted sidebar
- [x] Test: `tests/components/CnIndexPageSidebarColumnOverrides.spec.js`
