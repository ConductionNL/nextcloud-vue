# Tasks: saved-view-as-a-place

> A saved view becomes a place (ADR-032 `kind: code`).
> Checkbox budget: 4 tasks × 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The `savedViewPlaces` key on an index page
- **spec_ref**: `openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md#requirement-a-page-may-declare-that-its-saved-views-are-places`
- **files**: `src/manifest/schema/manifest-v2.schema.json`, `src/manifest/validateManifestV2.js`, `src/manifest/__tests__/manifestV2.spec.js`
- **acceptance_criteria**:
  - `savedViewPlaces` with `enabled`, `routeBase` and `navGroup` validates on an index page
  - The key on a page type that is not an index fails validation naming the page
  - A page without the key validates and behaves as today
  - The compiled validator is regenerated from the edited schema
- [ ] Implement
- [ ] Test

### Task 2: A route per view, rendering the index page
- **spec_ref**: `openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md#requirement-a-saved-view-has-a-route-of-its-own`
- **files**: `src/manifest/buildRouter.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/composables/useListView.js`, `src/components/__tests__/CnSavedViewPlace.spec.js`
- **acceptance_criteria**:
  - `/<page>/<routeBase>/:viewId` mounts the index page with the view's query and columns
  - A reload and a direct open both land on the view
  - `?view=<id>` redirects to the view route on a page that declares places (ADR-052)
  - A deleted or unreadable view renders the empty state naming it, with a link to the page
- [ ] Implement
- [ ] Test

### Task 3: Presentations declared by the view
- **spec_ref**: `openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md#requirement-a-view-offers-the-presentations-it-declares`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/composables/useListView.js`, the presentation components already wired for `saved-search-views`
- **acceptance_criteria**:
  - The view's presentation config decides which presentations are offered and which opens first
  - Switching presentation keeps the view route in the address bar
  - A presentation the host has not registered falls through to the next declared one and warns once
- [ ] Implement
- [ ] Test

### Task 4: Pinned views in the navigation, and the Pin action
- **spec_ref**: `openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md#requirement-a-pinned-view-takes-a-place-in-the-navigation`
- **files**: `src/manifest/buildNavigation.js`, `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `src/components/__tests__/CnSavedViewsControl.spec.js`
- **acceptance_criteria**:
  - A pinned view renders as a child of its page's navigation entry, never a new top-level entry
  - The ADR-097 budget counts pinned children; past the cap the rest are reachable from the page
  - Pin and Unpin write the existing favourite flag, not a second boolean
  - JSDoc and the component reference doc list the new key and the action
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
