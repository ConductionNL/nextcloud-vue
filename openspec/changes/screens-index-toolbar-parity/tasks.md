# Tasks: screens-index-toolbar-parity

> Row 1 of the board toolbar, Save view and the search placeholder (ADR-032 `kind: code`).

## Implementation tasks

### Task 1: Filter and the view switch as one unit
- **spec_ref**: `openspec/changes/screens-index-toolbar-parity/specs/index-toolbar-board-look/spec.md#requirement-filter-and-the-view-switch-are-one-unit-at-the-end-of-row-1`
- **files**: `src/components/CnActionsBar/CnActionsBar.vue`, `src/css/look-board-index.css`, `tests/components/CnIndexToolbarRowParity.spec.js`
- **acceptance_criteria**:
  - One `cn-actions-bar__view-controls` element holds Filter and the switch under the look, none without it
  - The unit does not wrap inside itself; after Save view its start margin is 0
- [x] Implement
- [x] Test

### Task 2: Save view as a Dutch ghost button
- **spec_ref**: `openspec/changes/screens-index-toolbar-parity/specs/index-toolbar-board-look/spec.md#requirement-save-view-is-a-ghost-button-in-the-users-language`
- **files**: `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `src/css/look-board-index.css`, `l10n/nl.json`, `l10n/en.json`, `tests/components/CnIndexToolbarRowParity.spec.js`
- **acceptance_criteria**:
  - No border, 34px, radius 17, light primary tint, 14px icon
  - nl.json carries the toolbar strings, "Save view" reads "Weergave opslaan"
- [x] Implement
- [x] Test

### Task 3: The search placeholder from the manifest
- **spec_ref**: `openspec/changes/screens-index-toolbar-parity/specs/index-toolbar-board-look/spec.md#requirement-the-search-placeholder-comes-from-the-manifest`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnIndexToolbarRowParity.spec.js`
- **acceptance_criteria**:
  - `searchPlaceholder` validates (schema 2.78.0); an empty string does not
  - The value goes through `cnTranslate`; without it the library default stays
- [x] Implement
- [x] Test

### Task 4: Browser check against the boards
- **spec_ref**: `openspec/changes/screens-index-toolbar-parity/specs/index-toolbar-board-look/spec.md#requirement-filter-and-the-view-switch-are-one-unit-at-the-end-of-row-1`
- **files**: `e2e/harness`
- **acceptance_criteria**:
  - Filter and the switch share a line at 1440px with DqZaken's chips
- [ ] Implement — not run: browser check is for the app lane on the live page (browser connections belong to the app lanes)
- [ ] Test — not run: same reason
