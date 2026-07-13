# saved-views-ui — fleet-wide saved search views on CnIndexPage

## Why

Saved filters/views is a researched handler-productivity gap. OpenRegister already ships the full BACKEND — `ViewsController` + `ViewService` + `View` entity (named saved-search views at `/apps/openregister/api/views`, owner-scoped with public sharing) — but no consuming UI exists anywhere in the fleet. Every app that wants "save this filter set" currently has to hand-roll it. Per ADR-Leaf-First: build the UI leaf once in nc-vue so every CnIndexPage consumer gets it.

## What

- `CnIndexPage` gains prop `allowSavedViews` (Boolean, default `false` — backwards compatible). When enabled, a Views dropdown (`CnSavedViewsControl`) renders in the toolbar's actions area that:
  - lists the user's saved views (own + public) from `GET /apps/openregister/api/views`;
  - applies a selected view by replacing the route query with its stored filters/search/sort — reusing CnIndexPage's existing route-query deep-link contract (non-underscore keys = filters; `_search`/`_sortKey`/`_sortOrder` added as reserved keys);
  - offers "Save current view…" (`CnSaveViewDialog`: name + public toggle) persisting the current route-query state via `POST /apps/openregister/api/views`;
  - offers delete of OWN views (ownership-gated affordance + `CnConfirmDialog`), via `DELETE /apps/openregister/api/views/{id}`.
- `src/utils/savedViewHelpers.js` — pure serialize/deserialize helpers (route query ↔ view state ↔ OR payload) + `isOwnView`, thoroughly unit-tested.
- `src/composables/useSavedViewsApi.js` — thin axios wrapper over the OR views REST surface.
- The view payload uses ViewsController's direct-`query` path (opaque JSON round-trip), NOT the `configuration` remap (that alternate shape is OR's own search-page contract).

## Non-goals

- No `configuration`-shape mapping (registers/schemas/facetFilters — OR search-page specific).
- No default-view auto-apply on page load (`isDefault` is persisted as `false`; auto-apply is a follow-up).
- No favoriting/renaming/sharing UI beyond the `isPublic` toggle at save time.
- No per-app view migration tooling.
- No multi-column-sort capture: `multi-column-sort-ui` (merged concurrently) persists shift+click sorts as a JSON `_order` route-query key; saved views capture single-key `_sortKey`/`_sortOrder` only. Capturing `_order` in the view state is a follow-up.

## References

- OpenRegister `lib/Controller/ViewsController.php`, `lib/Service/ViewService.php`, `lib/Db/View.php`, `appinfo/routes.php` (origin/development).
- OpenRegister `openspec/specs/saved-search-views/spec.md` (backend spec, canonical home).
- nc-vue `cnindexpage-export-action` change (PR #197) — the toolbar opt-in prop pattern this mirrors.
