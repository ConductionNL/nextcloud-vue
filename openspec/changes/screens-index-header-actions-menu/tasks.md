# Tasks: screens-index-header-actions-menu

### Task 1: Named menu entries
- **spec_ref**: `openspec/changes/screens-index-header-actions-menu/specs/index-header/spec.md#requirement-the-header-actions-menu-lists-what-its-items-name`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `headerMenuEntries`, `headerButtons[].items` (schema 2.90.0)
- [x] Test: `tests/components/CnIndexPageHeaderActionsMenu.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`; e2e `e2e/l7-header-actions-menu.e2e.js`

### Task 2: Link actions
- **spec_ref**: `openspec/changes/screens-index-header-actions-menu/specs/index-header/spec.md#requirement-a-header-action-can-be-a-link`
- [x] Implement: `type: "navigate"` + `target` becomes `href`
- [x] Test: unit spec and e2e

### Not in this change
- A breadcrumb line on an index header (board DqZaaktypen draws one): not built.
