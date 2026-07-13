# saved-views-ui Specification

## Purpose
TBD - created by archiving change saved-views-ui. Update Purpose after archive.
## Requirements
### Requirement: opt-in saved-views control

CnIndexPage SHALL render a saved-views dropdown (CnSavedViewsControl) in its toolbar actions area only when the `allowSavedViews` prop is `true`. The default SHALL be `false` and fully backwards compatible.

#### Scenario: control absent by default

- GIVEN a CnIndexPage without the `allowSavedViews` prop
- WHEN the page renders
- THEN no saved-views control is present AND no views API request is made

#### Scenario: control present when enabled

- GIVEN a CnIndexPage with `allowSavedViews: true`
- WHEN the page renders
- THEN the Views dropdown renders in the toolbar actions area

---

### Requirement: view listing

When enabled, CnIndexPage SHALL fetch the user's views from `GET /apps/openregister/api/views` on creation and list them (own + public, as scoped server-side) in the dropdown, with loading and empty states.

#### Scenario: views fetched and listed

- GIVEN the views API returns two views
- WHEN the page is created with `allowSavedViews: true`
- THEN `GET /apps/openregister/api/views` is called once AND both view names appear as menu entries

#### Scenario: empty state

- GIVEN the views API returns no views
- WHEN the dropdown renders
- THEN a "No saved views yet" caption is shown instead of view entries

---

### Requirement: apply view via route query

Selecting a view SHALL replace the route query with the view's stored state: stored filters as plain query keys, search as `_search`, sort as `_sortKey`/`_sortOrder`. Pagination (`_page`) SHALL NOT be carried over. The component SHALL emit `apply-view` with the applied view.

#### Scenario: apply writes filters, search and sort into the route query

- GIVEN a listed view whose stored query is `{ filters: { status: 'open' }, search: 'urgent', sort: { key: 'created', order: 'desc' } }`
- WHEN the view's menu entry is clicked
- THEN `$router.replace` is called with query `{ status: 'open', _search: 'urgent', _sortKey: 'created', _sortOrder: 'desc' }`

#### Scenario: filter-only view omits reserved keys

- GIVEN a listed view whose stored query has filters only (empty search, null sort)
- WHEN the view is applied
- THEN the resulting route query contains only the filter keys — no `_search`, `_sortKey`, `_sortOrder`, or `_page`

---

### Requirement: save current view

"Save current view…" SHALL open a dialog (CnSaveViewDialog) collecting a required name and an optional public toggle, and persist the CURRENT route-query state via `POST /apps/openregister/api/views` using the direct-`query` payload shape `{ name, description, isPublic, isDefault, query: { filters, search, sort } }`. On success the created view SHALL join the list and the dialog SHALL close; on failure the dialog SHALL stay open with the error surfaced.

#### Scenario: save posts the exact payload derived from the route query

- GIVEN the current route query is `{ status: 'open', _search: 'urgent', _sortKey: 'name', _sortOrder: 'asc', _page: '2' }`
- WHEN the user saves the view as "Saved" with the public toggle on
- THEN `POST /apps/openregister/api/views` receives `{ name: 'Saved', description: '', isPublic: true, isDefault: false, query: { filters: { status: 'open' }, search: 'urgent', sort: { key: 'name', order: 'asc' } } }` (no `_page` leakage)

#### Scenario: empty name is rejected client-side

- GIVEN the save dialog is open with an empty name
- WHEN the Save button is clicked
- THEN no POST is made

#### Scenario: failed save keeps the dialog open

- GIVEN the views API rejects the POST
- WHEN the save is confirmed
- THEN the dialog remains open with the error shown and the form re-enabled

---

### Requirement: delete own views only

The dropdown SHALL offer a delete entry ONLY for views whose `owner` equals the signed-in user's uid. Delete SHALL be confirm-gated (CnConfirmDialog) and call `DELETE /apps/openregister/api/views/{id}`, removing the view from the list on success. (OpenRegister additionally enforces owner scoping server-side — a foreign id 404s.)

#### Scenario: delete affordance is ownership-gated

- GIVEN the list contains one view owned by the current user and one owned by another user
- WHEN the dropdown renders
- THEN exactly one delete entry is present, on the own view

#### Scenario: confirmed delete removes the view

- GIVEN the delete confirmation dialog is open for an own view
- WHEN the user confirms
- THEN `DELETE /apps/openregister/api/views/{id}` is called AND the view disappears from the list

