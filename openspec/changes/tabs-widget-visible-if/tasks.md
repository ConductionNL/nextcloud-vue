# Tasks: tabs-widget-visible-if

> `visibleWhen` on a tab of `CnTabsWidget` (ADR-032 `kind: code`).
> Checkbox budget: 3 tasks × 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Schema key on a tab entry
- **spec_ref**: `openspec/changes/tabs-widget-visible-if/specs/tabs-widget/spec.md#requirement-a-tab-may-declare-a-visibility-condition`
- **files**: `src/manifest/schema/manifest-v2.schema.json`, `src/manifest/validateManifestV2.js`, `src/manifest/__tests__/manifestV2.spec.js`
- **acceptance_criteria**:
  - A tab entry accepts `visibleWhen` as a `$ref` to `#/$defs/visibleWhen`
  - A local-mode predicate naming a field absent from the page schema fails validation naming the tab id
  - The compiled validator is regenerated
- [ ] Implement
- [ ] Test

### Task 2: Evaluate and hide
- **spec_ref**: `openspec/changes/tabs-widget-visible-if/specs/tabs-widget/spec.md#requirement-a-hidden-tab-is-absent-not-empty`
- **files**: `src/components/CnTabsWidget/CnTabsWidget.vue`, `src/components/__tests__/CnTabsWidgetVisibleWhen.spec.js`
- **acceptance_criteria**:
  - Local mode re-evaluates on object change; source mode counts once per mount and after a reported write
  - A pending source condition renders the tab disabled, not absent
  - JSDoc and the component reference doc describe the key
- [ ] Implement
- [ ] Test

### Task 3: Active tab and deep links stay valid
- **spec_ref**: `openspec/changes/tabs-widget-visible-if/specs/tabs-widget/spec.md#requirement-the-active-tab-is-always-a-visible-tab`
- **files**: `src/components/CnTabsWidget/CnTabsWidget.vue`, `src/components/__tests__/CnTabsWidgetVisibleWhen.spec.js`
- **acceptance_criteria**:
  - Hiding the active tab activates the first visible tab and updates the hash
  - A hash naming a hidden tab falls back without an error
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
