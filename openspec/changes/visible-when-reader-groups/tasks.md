# Tasks: visible-when-reader-groups

### Task 1: Evaluate readerGroups in visibleWhen
- **spec_ref**: `openspec/changes/visible-when-reader-groups/specs/visible-when-reader-groups/spec.md#requirement-a-visiblewhen-condition-can-require-the-reader-to-be-in-a-group`
- **files**: `src/utils/visibleWhen.js`, `src/utils/widgetVisibility.js`, `src/utils/userGroupsPeek.js`
- [ ] Implement: `readerGroups` as a precondition in `evaluateVisibleWhen()` and `evaluateVisibleWhenLocal()`, false while groups are unknown, one cached lookup
- [ ] Test: `tests/utils/visibleWhen*.spec.js` (member, non-member, admin group, loading, lookup failure, combined with `field`)

### Task 2: Schema and docs
- **spec_ref**: `openspec/changes/visible-when-reader-groups/specs/visible-when-reader-groups/spec.md#requirement-a-visiblewhen-condition-can-require-the-reader-to-be-in-a-group`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `docs/utilities/visible-when.md`
- [ ] Implement: `readerGroups` on the visibleWhen definition; document it beside `appInstalled` on a new `docs/utilities/visible-when.md` page
- [ ] Test: `tests/schemas/app-manifest-v2.schema.spec.js`

### Task 3: Header actions pick it up
- **files**: `src/components/CnActionButtons/CnActionButtons.vue`
- [ ] Test: a header action gated on `readerGroups` is hidden for a non-member and shown for a member, with no request per action
