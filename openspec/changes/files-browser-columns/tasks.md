# Tasks: files-browser-columns

> Declared columns on `CnFilesBrowser` (ADR-032 `kind: code`).
> Checkbox budget: 3 tasks × 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The `columns` key on the files widget config
- **spec_ref**: `openspec/changes/files-browser-columns/specs/files-browser/spec.md#requirement-a-host-may-declare-the-columns-of-a-files-browser`
- **files**: `src/utils/validateManifest.js`, `tests/utils/validateManifest.filesColumns.spec.js`
- **acceptance_criteria**:
  - A string or column object validates on the `files` widget config
  - An unknown built-in name fails validation naming the widget and the key
  - The compiled validator is regenerated from the edited schema (by `npm run build:validators`, which runs as `pretest` and `prebuild`; the file is gitignored)
- [x] Implement
- [x] Test

### Task 2: CnFilesBrowser renders declared columns from node, attribute and row data
- **spec_ref**: `openspec/changes/files-browser-columns/specs/files-browser/spec.md#requirement-a-column-reads-from-the-node-a-dav-property-or-host-row-data`
- **files**: `src/components/CnFilesBrowser/filesBrowserColumns.js`, `src/components/CnFilesBrowser/CnFilesBrowser.vue`, `docs/components/cn-files-browser.md`, `tests/__mocks__/nextcloud-files-dav.js`, `tests/components/CnFilesBrowserColumns.spec.js`
- **acceptance_criteria**:
  - `columns` and `rowData` props with defaults; no `columns` renders today's three
  - `attribute` columns are added to the PROPFIND before listing
  - Cells render through `CnCellRenderer` with `formatter` and the node as `row`
  - `rowData` as a function is called once per listed folder
  - JSDoc and the component reference doc list the props and the column shape
- [x] Implement
- [x] Test

### Task 3: Sorting and the per-user chooser
- **spec_ref**: `openspec/changes/files-browser-columns/specs/files-browser/spec.md#requirement-sorting-and-a-per-user-chooser`
- **files**: `src/components/CnFilesBrowser/filesBrowserColumns.js`, `src/components/CnFilesBrowser/CnFilesBrowser.vue`, `src/composables/useUserPreferences.js` (reused, not changed), `tests/components/CnFilesBrowserColumns.spec.js`
- **acceptance_criteria**:
  - `node` columns sort through `sortBy`; sortable `row` and `attribute` columns sort client-side
  - The chooser hides declared columns, never adds, and persists per user under the host key
  - `npm test` and `npm run build` pass
- [x] Implement
- [x] Test
