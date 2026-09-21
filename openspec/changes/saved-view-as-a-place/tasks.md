# Tasks: saved-view-as-a-place

> A saved view becomes a place (ADR-032 `kind: code`).
> Checkbox budget: 4 tasks × 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The `savedViewPlaces` key on an index page
- **spec_ref**: `openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md#requirement-a-page-may-declare-that-its-saved-views-are-places`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `src/types/manifest.d.ts`, `tests/schemas/app-manifest-v2.schema.spec.js` (the validator is compiled from the schema at test time, so the schema IS the validator here)
- **acceptance_criteria**:
  - `savedViewPlaces` with `enabled`, `routeBase` and `navGroup` validates on an index page
  - The key on a page type that is not an index fails validation naming the page
  - A page without the key validates and behaves as today
  - The compiled validator is regenerated from the edited schema
- [x] Implement
- [x] Test

### Task 2: A route per view, rendering the index page
- **spec_ref**: `openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md#requirement-a-saved-view-has-a-route-of-its-own`
- **files**: `src/utils/savedViewPlaces.js`, `src/utils/buildManifestRoutes.js`, `src/components/CnPageRenderer/CnPageRenderer.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `tests/utils/savedViewPlaces.spec.js`, `tests/utils/buildManifestRoutes.spec.js`, `tests/components/CnIndexPageSavedViewPlaces.spec.js`
- **acceptance_criteria**:
  - `/<page>/<routeBase>/:viewId` mounts the index page with the view's query and columns
  - A reload and a direct open both land on the view
  - `?view=<id>` redirects to the view route on a page that declares places (ADR-052)
  - A deleted or unreadable view renders the empty state naming it, with a link to the page
- [x] Implement
- [x] Test

### Task 3: Presentations declared by the view
- **spec_ref**: `openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md#requirement-a-view-offers-the-presentations-it-declares`
- **files**: `src/utils/savedViewPlaces.js` (`resolveViewPresentation`), `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnIndexPage/CnIndexPage.md`
- **acceptance_criteria**:
  - The view's presentation config decides which presentations are offered and which opens first
  - Switching presentation keeps the view route in the address bar
  - A presentation the host has not registered falls through to the next declared one and warns once
- [x] Implement
- [x] Test

### Task 4: Pinned views in the navigation, and the Pin action
- **spec_ref**: `openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md#requirement-a-pinned-view-takes-a-place-in-the-navigation`
- **files**: `src/utils/savedViewPlaces.js` (`withPinnedViewChildren`), `src/components/CnAppNav/CnAppNav.vue`, `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `src/composables/useSavedViewsApi.js`
- **acceptance_criteria**:
  - A pinned view renders as a child of its page's navigation entry, never a new top-level entry
  - The ADR-097 budget counts pinned children; past the cap the rest are reachable from the page
  - Pin and Unpin write the existing favourite flag, not a second boolean
  - JSDoc and the component reference doc list the new key and the action
  - `npm test` and `npm run build` pass
- [x] Implement
- [x] Test

## What is built, and what a reader should not assume from a tick

CnIndexPage renders `table`, `cards`, `list` and `map`. It registers no board
and no calendar, so a view declaring `kanban` falls through to the page's own
first presentation and warns once, which is the fall-through this change
specifies rather than a gap in it. A board that opens from a view route
arrives with the presentation components themselves, in
`object-views-kanban-calendar` and `cn-timeline-view`.

Pinning writes `favoredBy` through `PATCH /api/views/{id}`. OpenRegister
scopes view mutations to the owner, so pinning a PUBLIC view somebody else
owns is refused server side today. The pin is per user and the field is a
list of users, so the server side of that is OpenRegister's to open up; the
control shows the error rather than pretending the pin landed.
