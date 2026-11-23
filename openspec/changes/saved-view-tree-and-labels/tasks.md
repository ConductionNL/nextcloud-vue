# Tasks: saved-view-tree-and-labels

> Saved views get a tree, labels and a name (ADR-032 `kind: code`).
> Checkbox budget: 8 tasks x 2 = 16 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Manifest keys for the tree, the labels and the seeded set
- **spec_ref**: `openspec/changes/saved-view-tree-and-labels/specs/saved-views-ui/spec.md#requirement-a-saved-view-has-a-parent-and-inherits-what-it-does-not-override`
- **files**: `src/manifest/schema/manifest-v2.schema.json`, `src/manifest/validateManifestV2.js`, `src/manifest/__tests__/manifestV2.spec.js`
- **acceptance_criteria**:
  - `savedViewTree` with `enabled`, `maxDepth` and `seeded[]` validates on an index page
  - A seeded view without a slug fails validation naming the view
  - A page without the key validates and renders the flat dropdown
  - The compiled validator is regenerated from the edited schema
- [x] Implement
- [x] Test

### Task 2: Inheritance resolved over five flags
- **spec_ref**: `openspec/changes/saved-view-tree-and-labels/specs/saved-views-ui/spec.md#requirement-a-saved-view-has-a-parent-and-inherits-what-it-does-not-override`
- **files**: `src/composables/useListView.js`, `src/utils/resolveViewInheritance.js`, `src/composables/__tests__/useListView.spec.js`
- **acceptance_criteria**:
  - Criteria, columns, sorting, default sort and export field set resolve independently up the chain
  - A child overriding only the criteria keeps the parent's columns
  - A cycle in the parent chain is refused and the message names both views
  - A chain deeper than `maxDepth` is refused and names the view
- [x] Implement
- [x] Test

### Task 3: The control renders a tree, and filters by label
- **spec_ref**: `openspec/changes/saved-view-tree-and-labels/specs/saved-views-ui/spec.md#requirement-labels-filter-the-list-of-saved-views`
- **files**: `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `src/components/__tests__/CnSavedViewsControl.spec.js`
- **acceptance_criteria**:
  - Views render as a tree with the seeded group first
  - A label filter narrows the list, and the labels already in use are offered before a new one
  - A view whose parent the user may not read renders at the root with its inherited parts noted
  - Keyboard operation reaches every node, and the tree carries the right ARIA roles
- [x] Implement
- [x] Test

### Task 4: A slug, and calling a view by it
- **spec_ref**: `openspec/changes/saved-view-tree-and-labels/specs/saved-views-ui/spec.md#requirement-a-view-is-named-once-and-called-by-name`
- **files**: `src/composables/useListView.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/stores/` view store plugin, `src/components/__tests__/CnSavedViewSlug.spec.js`
- **acceptance_criteria**:
  - A widget, an export action and an API caller resolve a view by slug
  - A second view claiming a slug in use fails and names the holder
  - A slug is editable only while nothing cites it
  - An unknown slug renders the empty state naming it, not a blank list
- [x] Implement
- [x] Test

### Task 5: View templates
- **spec_ref**: `openspec/changes/saved-view-tree-and-labels/specs/saved-views-ui/spec.md#requirement-a-new-view-starts-from-a-template`
- **files**: `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `src/composables/useListView.js`
- **acceptance_criteria**:
  - Save as new offers the templates the host declares
  - A template presets columns, sort and export field set, and the user may change each
  - No template declared means today's behaviour, saving the current list
- [x] Implement
- [x] Test

### Task 6: Administered landing view and columns per role
- **spec_ref**: `openspec/changes/saved-view-tree-and-labels/specs/saved-views-ui/spec.md#requirement-an-administrator-sets-the-view-and-the-columns-a-role-opens-on`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/composables/useListView.js`, `src/components/__tests__/CnIndexPageDefaults.spec.js`
- **acceptance_criteria**:
  - A user with no personal choice lands on the view their role declares
  - A personal choice wins, and Reset returns to the administered view
  - Per-role columns narrow `index-columns-per-scope` rather than replacing it
  - A role's landing view changing mid-session applies on the next arrival, never by moving the user
- [x] Implement
- [x] Test

### Task 7: Group by a field, with counts, and a link to a view
- **spec_ref**: `openspec/changes/saved-view-tree-and-labels/specs/saved-views-ui/spec.md#requirement-the-list-groups-by-one-field-with-a-count-per-group`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnActionsBar/CnActionsBar.vue`, `src/components/__tests__/CnIndexPageGrouping.spec.js`
- **acceptance_criteria**:
  - Grouping runs over the rows the list holds, with a count per group and no second fetch
  - A paged list says the counts are for the page it holds
  - Copy link on a saved view yields its route from `saved-view-as-a-place`
  - An unsaved hand-filtered list offers Save and share, not a query-parameter URL
- [x] Implement
- [x] Test

### Task 8: Actions declared per view, and the docs
- **spec_ref**: `openspec/changes/saved-view-tree-and-labels/specs/saved-views-ui/spec.md#requirement-a-view-declares-the-actions-it-offers`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `docs/components/cn-index-page.md`, `docs/components/cn-saved-views-control.md`
- **acceptance_criteria**:
  - A view's declared actions intersect with the actions the user may run; a view never adds one
  - A view declaring nothing offers the page's actions, as today
  - JSDoc and the two reference docs list every new prop, event and manifest key
  - `npm test` and `npm run build` pass
- [x] Implement
- [x] Test
