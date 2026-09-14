# Tasks: case-page-and-list-as-a-place

> The list and the case become a place a person stays in (ADR-032 `kind: code`).
> Checkbox budget: 8 tasks x 2 = 16 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The split route and the manifest key
- **spec_ref**: `openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md#requirement-the-list-and-one-record-sit-side-by-side`
- **files**: `src/manifest/schema/manifest-v2.schema.json`, `src/manifest/validateManifestV2.js`, `src/manifest/buildRouter.js`
- **acceptance_criteria**:
  - `splitView` with `enabled` and `breakpoint` validates on an index page and is refused elsewhere
  - `/<page>/split/:id` resolves, and below the breakpoint the same URL renders the full detail page
  - A page without the key validates and renders as today
  - The compiled validator is regenerated from the edited schema
- [ ] Implement
- [ ] Test

### Task 2: The split pane keeps the list alive
- **spec_ref**: `openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md#requirement-the-list-and-one-record-sit-side-by-side`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/composables/useListView.js`, `src/components/__tests__/CnIndexPageSplit.spec.js`
- **acceptance_criteria**:
  - Opening a record in the pane keeps the list's scroll position, selection and page
  - The pane mounts the same `CnDetailPage` the full route mounts
  - Saving in the pane replaces that row in the list in place, with no refetch of the page
  - Closing the pane leaves the list where it was
- [ ] Implement
- [ ] Test

### Task 3: Next and previous inside the list you came from
- **spec_ref**: `openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md#requirement-a-record-steps-to-the-next-one-in-the-list-it-came-from`
- **files**: `src/composables/useDetailView.js`, `src/components/CnDetailPage/CnDetailPage.vue`, `src/composables/__tests__/useDetailView.spec.js`
- **acceptance_criteria**:
  - The detail page reads the list, its filter and its sort from the route and steps through them
  - A reload keeps next and previous working
  - A link carrying no list context offers no next and previous, rather than guessing an order
  - The first and the last record say so instead of wrapping
- [ ] Implement
- [ ] Test

### Task 4: The active tab in the URL
- **spec_ref**: `openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md#requirement-the-active-tab-is-part-of-the-address`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/manifest/buildRouter.js`, `src/components/__tests__/CnDetailPageTabs.spec.js`
- **acceptance_criteria**:
  - Switching tab changes the address, and opening that address opens that tab
  - An unknown or forbidden tab falls back to the first tab the user may see, and says so once
  - The old tabless address redirects to the canonical one (ADR-052)
  - Back and forward walk the tabs a user actually visited
- [ ] Implement
- [ ] Test

### Task 5: `CnReferencePreview`
- **spec_ref**: `openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md#requirement-a-reference-previews-in-place`
- **files**: `src/components/CnReferencePreview/CnReferencePreview.vue`, `src/components/CnReferencePreview/index.js`, `src/components/index.js`, `src/index.js`, `src/components/__tests__/CnReferencePreview.spec.js`
- **acceptance_criteria**:
  - The preview opens on focus and on hover, closes on escape and on blur, and never traps focus
  - A record fetches once per page and is cached
  - A reference the user may not read renders plainly with no preview and no request
  - The preview is announced to a screen reader as a summary of the referenced record
- [ ] Implement
- [ ] Test

### Task 6: Manual order, and ordering the shared lists
- **spec_ref**: `openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md#requirement-a-person-orders-their-own-lists-and-their-own-navigation`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/manifest/buildNavigation.js`, `src/components/__tests__/CnIndexPageManualOrder.spec.js`
- **acceptance_criteria**:
  - A dragged row order is stored per user and per list, never on the records
  - Two users ordering one shared list do not affect each other
  - The navigation entries of the shared lists reorder per user
  - Both orders are operable from the keyboard
- [ ] Implement
- [ ] Test

### Task 7: The nine preferences, in one group
- **spec_ref**: `openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md#requirement-a-person-sets-how-the-product-opens-for-them`
- **files**: `src/stores/preferences.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnSettingsSection/`, `src/stores/__tests__/preferences.spec.js`
- **acceptance_criteria**:
  - Last used view, date display, landing page and pinned entries are read from and written to Nextcloud personal settings
  - App default, administered value and personal value resolve in that order
  - The instance switch that turns personal customisation off collapses the personal layer and says so in the interface
  - A relative date always carries its absolute date in the accessible name and the tooltip
- [ ] Implement
- [ ] Test

### Task 8: The skip link, the high contrast flag and the docs
- **spec_ref**: `openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md#requirement-the-detail-page-is-reachable-and-readable-from-the-keyboard`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`, `docs/components/cn-index-page.md`, `docs/components/cn-detail-page.md`
- **acceptance_criteria**:
  - A skip link reaches the page's declared primary action, visible on focus
  - A widget declaring high contrast exposes the flag to the theme and picks no colour itself
  - JSDoc and the reference docs list every new prop, event, route and preference
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
