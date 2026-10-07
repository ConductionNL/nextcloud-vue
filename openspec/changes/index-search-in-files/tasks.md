# Tasks: index-search-in-files

> File-content search on index pages over OpenRegister `_content_search`
> (ADR-032 `kind: code`).

## Implementation tasks

### Task 1: The switch and the query key
- **spec_ref**: `openspec/changes/index-search-in-files/specs/index-page/spec.md#requirement-an-index-page-can-search-inside-attached-files`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnIndexPageSearchInFiles.spec.js`
- **acceptance_criteria**:
  - `searchInFiles` prop with default `false`; manifest key accepted as boolean
  - `_content_search=true` only with the switch on and a term; `contentSearch=1` in the route
  - Footer note about the cap of 50
- [ ] Implement
- [ ] Test

### Task 2: Found in line
- **spec_ref**: `openspec/changes/index-search-in-files/specs/index-page/spec.md#requirement-a-row-found-through-a-file-names-the-file`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnIndexPageSearchInFiles.spec.js`, CnIndexPage reference docs
- **acceptance_criteria**:
  - "Found in {file}" from `@self.matchedFile`, plain text, secondary colour
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
