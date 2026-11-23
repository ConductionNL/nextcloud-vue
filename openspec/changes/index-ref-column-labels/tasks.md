# Tasks: index-ref-column-labels

> `labelField` on `$ref` columns in `CnIndexPage` (ADR-032 `kind: code`).
> Checkbox budget: 3 tasks × 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Batched label resolver
- **spec_ref**: `openspec/changes/index-ref-column-labels/specs/index-page/spec.md#requirement-a-reference-column-renders-a-label-field`
- **files**: `src/composables/useRefLabels.js`, `src/composables/__tests__/useRefLabels.spec.js`
- **acceptance_criteria**:
  - One request per referenced schema per page of rows, distinct ids only
  - Cache per register and schema, invalidated on a reported write
  - Unresolved ids resolve to `null` and never throw
- [x] Implement
- [x] Test

### Task 2: Column rendering, link and fallback
- **spec_ref**: `openspec/changes/index-ref-column-labels/specs/index-page/spec.md#requirement-a-reference-column-renders-a-label-field`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnDataTable/CnDataTable.vue`, `src/components/__tests__/CnIndexPageRefLabels.spec.js`
- **acceptance_criteria**:
  - `labelField`, the schema title field and the id fall back in that order
  - `link: true` renders a router link to the declared detail page
  - Rows render before labels arrive; labels fill in place
  - JSDoc and the component reference doc updated
- [x] Implement
- [x] Test

### Task 3: Filter and sort over labels
- **spec_ref**: `openspec/changes/index-ref-column-labels/specs/index-page/spec.md#requirement-filters-on-a-reference-column-show-labels`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnFilterBar/CnFilterBar.vue`, `src/components/__tests__/CnIndexPageRefLabels.spec.js`
- **acceptance_criteria**:
  - The facet lists labels and filters by id
  - A label column is sortable only when the store can sort the extended field
  - `npm test` and `npm run build` pass
- [x] Implement
- [x] Test

> Built as `src/composables/useRefLabels.js`, the `refLabel` cell widget of `CnCellRenderer` and the `renderedColumns` / `refLabelSpecs` computeds of `CnIndexPage`. Not done: the referenced schema's declared title field as a fallback (needs the referenced schema loaded; the chain is `labelField`, `title`, `name`, `@self.name`, then the id), and `quickFilters` over a reference (the facet sidebar shows labels). Not run: needs a live instance for the `_ids` batch against OpenRegister.
