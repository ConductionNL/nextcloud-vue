# Tasks: index-columns-per-scope

> A column set per `folderSidebar` scope on `CnIndexPage` (ADR-032 `kind: code`).
> Checkbox budget: 3 tasks × 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Schema keys on a sidebar scope
- **spec_ref**: `openspec/changes/index-columns-per-scope/specs/index-page/spec.md#requirement-a-sidebar-scope-may-declare-its-own-list-layout`
- **files**: `src/manifest/schema/manifest-v2.schema.json`, `src/manifest/validateManifestV2.js`, `src/manifest/__tests__/manifestV2.spec.js`
- **acceptance_criteria**:
  - `columns`, `defaultSort` and `searchFields` validate on a scope entry
  - A `columns` entry that names a key absent from the schema fails validation with the scope id
  - The compiled validator is regenerated from the edited schema
- [ ] Implement
- [ ] Test

### Task 2: CnIndexPage resolves layout from the active scope
- **spec_ref**: `openspec/changes/index-columns-per-scope/specs/index-page/spec.md#requirement-the-active-scope-drives-columns-sort-and-search`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/composables/useListView.js`, `src/components/__tests__/CnIndexPageScopeColumns.spec.js`
- **acceptance_criteria**:
  - Switching scope re-renders the header with the scope's columns and refetches with its sort
  - A scope without the keys renders the page's columns
  - `searchFields` is forwarded to the store's search parameter
  - JSDoc and the component reference doc list the keys
- [ ] Implement
- [ ] Test

### Task 3: Row-carried layout as a second source
- **spec_ref**: `openspec/changes/index-columns-per-scope/specs/index-page/spec.md#requirement-a-schema-derived-folder-reads-its-layout-from-the-row`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/__tests__/CnIndexPageScopeColumns.spec.js`
- **acceptance_criteria**:
  - A folder derived from a row with `x-index.columns` uses those columns when the folder declares none
  - A declared folder value wins over the row value
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
