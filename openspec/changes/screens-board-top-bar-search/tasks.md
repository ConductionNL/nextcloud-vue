# Tasks: screens-board-top-bar-search

> ADR-032 `kind: code`. Each task: jest green, JSDoc on new props.

## Implementation tasks

### Task 1: The app's line on the header search field
- **spec_ref**: `openspec/changes/screens-board-top-bar-search/specs/layout-components/spec.md#requirement-the-board-look-names-what-the-header-search-finds`
- **files**: `src/components/CnHeaderSearchLabel/CnHeaderSearchLabel.vue`, `src/components/CnAppRoot/CnAppRoot.vue`, `src/schemas/app-manifest-v2.schema.json`, `src/utils/validateManifestV2.compiled.js`, `tests/components/CnHeaderSearchLabel.spec.js`
- **acceptance_criteria**:
  - Under the board look with `nav.searchPlaceholder` and `#header`, the label shows the translated line
  - No element Nextcloud drew is added, moved or removed; its text node is kept
  - A re-rendered field gets the line again; unmount restores Nextcloud's line
  - Without the board look, the key or the header, nothing changes
- [x] Implement
- [x] Test

### Task 2: The brand link is 237px, the divider follows it
- **spec_ref**: `openspec/changes/screens-board-top-bar-search/specs/layout-components/spec.md#requirement-the-board-look-draws-the-brand-block-in-the-nextcloud-header`
- **files**: `src/components/CnBrandBar/CnBrandBar.vue`, `tests/components/CnBrandBar.spec.js`
- **acceptance_criteria**:
  - The brand link is 237px wide and the divider sits 12px after it
- [x] Implement
- [x] Test
