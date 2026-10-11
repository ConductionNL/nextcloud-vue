# Tasks: screens-index-stat-row

## Implementation Tasks

### Task 1: The widget host
- **spec_ref**: `openspec/changes/screens-index-stat-row/specs/index-page/spec.md#requirement-an-index-page-can-draw-a-stat-row-above-the-list`
- **files**: `src/components/CnIndexPage/CnIndexPageWidgets.vue`
- [x] Implement: three-layer type resolution, wrapper per variant, skip with warning
- [x] Test: catalog resolution, skipped entries

### Task 2: The stat row
- **spec_ref**: `openspec/changes/screens-index-stat-row/specs/index-page/spec.md#requirement-an-index-page-can-draw-a-stat-row-above-the-list`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `statRow` prop, row above the toolbar
- [x] Test: order, auto grid, above the toolbar, no titles or menus; absent without the key

### Task 3: The side panel
- **spec_ref**: `openspec/changes/screens-index-stat-row/specs/index-page/spec.md#requirement-an-index-page-can-draw-a-side-panel-beside-the-list`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/css/index-page.css`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `sidePanel` prop, the aside, the grid areas
- [x] Test: aside, translated titles, header link, layout class
- [ ] Browser: DqTeamwachtrij and PqContracten on :8080 at 1440px and 900px (not run: app lanes check after the release)

### Task 4: Documentation
- **files**: `docs/components/cn-index-page.md`
- [x] Document `statRow` and `sidePanel`
