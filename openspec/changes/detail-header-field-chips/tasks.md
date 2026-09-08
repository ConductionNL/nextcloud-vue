# Tasks: detail-header-field-chips

> Field chips in the `CnDetailPage` header (ADR-032 `kind: code`).
> Checkbox budget: 3 tasks × 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Schema and resolution of `headerFields`
- **spec_ref**: `openspec/changes/detail-header-field-chips/specs/detail-page-header/spec.md#requirement-a-detail-page-may-declare-header-fields`
- **files**: `src/manifest/schema/manifest-v2.schema.json`, `src/manifest/validateManifestV2.js`, `src/composables/useDetailView.js`, `src/manifest/__tests__/manifestV2.spec.js`
- **acceptance_criteria**:
  - `headerFields` validates as strings or objects with `key`, `format`, `labelField`, `colorField`, `warnWhenPast`
  - A key absent from the schema fails validation naming the page and key
  - The compiled validator is regenerated
- [ ] Implement
- [ ] Test

### Task 2: Render the chips row
- **spec_ref**: `openspec/changes/detail-header-field-chips/specs/detail-page-header/spec.md#requirement-chips-render-by-format-and-never-blank`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/components/CnDetailPage/CnDetailHeaderChips.vue`, `src/components/__tests__/CnDetailHeaderChips.spec.js`
- **acceptance_criteria**:
  - Each format renders as designed; empty values render no chip; empty row renders nothing
  - A `$ref` chip shows `labelField` and falls back to the id in mono
  - Colours come from the shared variant map over Nextcloud CSS variables
  - JSDoc and the component reference doc updated
- [ ] Implement
- [ ] Test

### Task 3: Accessibility and print
- **spec_ref**: `openspec/changes/detail-header-field-chips/specs/detail-page-header/spec.md#requirement-chips-are-readable-by-assistive-technology-and-in-print`
- **files**: `src/components/CnDetailPage/CnDetailHeaderChips.vue`, `src/components/__tests__/CnDetailHeaderChips.spec.js`
- **acceptance_criteria**:
  - Each chip exposes the property title and value to a screen reader
  - The row prints as plain text
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
