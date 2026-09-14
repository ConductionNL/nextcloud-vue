# Tasks: cnindexpage-folder-schema

> A folder that carries its own register and schema on `CnIndexPage`
> (ADR-032 `kind: code`). Checkbox budget: 3 tasks × 2 = 6 unindented `- [ ]`
> lines (cap 20).

## Implementation tasks

### Task 1: A folder entry may declare `schema` and `register`
- **spec_ref**: `openspec/changes/cnindexpage-folder-schema/specs/index-page/spec.md#requirement-a-folder-may-declare-its-own-schema`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue` (JSDoc on the
  `folderSidebar` prop), `docs/utilities/validate-manifest-v2.md`,
  `src/components/__tests__/CnIndexPageFolderSchema.spec.js`
- **acceptance_criteria**:
  - A folder with `schema` (and optional `register`) is accepted with no
    manifest schema change, matching the already-permissive `config` shape
  - A folder without `schema` is documented as unaffected
  - JSDoc and the docs page list both keys and the default-to-page-register
    behaviour
- [ ] Implement
- [ ] Test

### Task 2: `useSelfFetchList` resolves a reactive object type
- **spec_ref**: `openspec/changes/cnindexpage-folder-schema/specs/index-page/spec.md#requirement-selecting-a-schema-folder-switches-the-loaded-object-type`
- **files**: `src/components/CnIndexPage/useSelfFetchList.js`,
  `src/composables/useListView.js`, `src/composables/useObjectSubscription.js`,
  `src/components/CnIndexPage/CnIndexPage.vue`,
  `src/components/__tests__/CnIndexPageFolderSchema.spec.js`
- **acceptance_criteria**:
  - Selecting a folder that declares `schema` re-fetches page 1 under the
    new register/schema and shows that schema's columns
  - Returning to "All", or to a folder without `schema`, restores the page's
    own register/schema
  - The live-update subscription re-attaches to the new object type and the
    old one is torn down (no stray events after switching)
  - A page whose `folderSidebar` folders never declare `schema` fetches and
    subscribes exactly as before (regression coverage for every existing
    `source` today: `custom`, `field`, `register`, `files`)
- [ ] Implement
- [ ] Test

### Task 3: Selection and dialog state reset on schema switch
- **spec_ref**: `openspec/changes/cnindexpage-folder-schema/specs/index-page/spec.md#requirement-switching-schema-clears-row-selection`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`,
  `src/components/__tests__/CnIndexPageFolderSchema.spec.js`
- **acceptance_criteria**:
  - Selected rows from the previous schema are cleared when the object type
    changes
  - An open form/delete/copy dialog bound to a row of the previous schema is
    closed rather than left pointing at a row of the new one
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
