# Tasks: saved-views-ui

## 1. Pure helpers

- [x] 1.1 `src/utils/savedViewHelpers.js`: `extractViewStateFromRouteQuery`, `buildRouteQueryFromViewState`, `buildViewCreatePayload`, `extractViewState`, `isOwnView` — all defensive, never throw.
- [x] 1.2 `tests/utils/savedViewHelpers.spec.js` — 26 cases incl. both round-trips and malformed-input degradation.

## 2. API wrapper

- [x] 2.1 `src/composables/useSavedViewsApi.js` — `fetchViews`/`createView`/`updateView`/`deleteView` bound to `GET|POST /apps/openregister/api/views`, `PUT|DELETE /apps/openregister/api/views/{id}` (direct-`query` payload path).

## 3. Components

- [x] 3.1 `CnSavedViewsControl` (presentational NcActions dropdown: list/apply/save-request/delete-request, ownership-gated delete, loading + empty states) + barrel + docs.
- [x] 3.2 `CnSaveViewDialog` (NcDialog + NcTextField name + public toggle; single-phase with `setError()` ref contract; deliberately NOT NcActionInput) + barrel + docs.
- [x] 3.3 Register both in `src/components/index.js` + `src/index.js`.

## 4. CnIndexPage wiring

- [x] 4.1 `allowSavedViews` prop (default false), control in the `#actions` toolbar slot.
- [x] 4.2 Fetch on created(); apply via `$router.replace({ query })`; save via POST with route-query-derived state; delete via CnConfirmDialog + DELETE; `@apply-view` event.
- [x] 4.3 Docs: `CnIndexPage.md` + `docs/components/cn-index-page.md` prop/event rows.

## 5. Tests / quality gates

- [x] 5.1 `tests/components/CnIndexPageSavedViews.spec.js` — 12 cases: absent by default, present when enabled, fetch-on-create, list render, empty state, apply (full + filter-only) sets route query, ownership-gated delete, save posts exact payload, failed save keeps dialog open, delete round-trip, empty-name guard.
- [x] 5.2 Jest mock gap fixed: `NcActionCaption`/`NcActionCheckbox`/`NcActionSeparator` stubs added to `tests/__mocks__/nextcloud-vue.js` (pre-existing gap).
- [x] 5.3 Full `npm test` + `npm run lint` + `npm run build` + `check:docs` + `check:jsdoc` green; jsdoc baselines updated (2 new components at 100%).
