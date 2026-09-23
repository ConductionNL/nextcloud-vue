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

Selecting a view SHALL replace the route query with the view's stored state: stored filters as plain query keys, search as `_search`, sort as `_order`. `_order` is the JSON-encoded ordered array `[{ key, order }, …]` — the one spelling every other list in the library writes and the only one OpenRegister's object API reads. `_sortKey`/`_sortOrder` SHALL NOT be written or read; a link carrying them SHALL open in the page's default order. Pagination (`_page`) SHALL NOT be carried over. The component SHALL emit `apply-view` with the applied view.

A view is applied onto the page's own address. No saved view SHALL have an address of its own.

This retracts `saved-view-as-a-place`, which gave every view of a declaring page a route, a presentation and a pin in the navigation. It was built and it worked; what it wrote into the address was a sort format nothing in the stack read, and a view stores filters, a search term and a sort — not enough to be somewhere you go. Its four requirements are withdrawn, not modified: the library keeps no redirect for the addresses it minted, because it cannot know which app minted which.

#### Scenario: apply writes filters, search and sort into the route query

- GIVEN a listed view whose stored query is `{ filters: { status: 'open' }, search: 'urgent', sort: [{ key: 'created', order: 'desc' }] }`
- WHEN the view's menu entry is clicked
- THEN `$router.replace` is called with query `{ status: 'open', _search: 'urgent', _order: '[{"key":"created","order":"desc"}]' }`

#### Scenario: filter-only view omits reserved keys

- GIVEN a listed view whose stored query has filters only (empty search, null sort)
- WHEN the view is applied
- THEN the resulting route query contains only the filter keys — no `_search`, `_order`, or `_page`

#### Scenario: a chained sort survives the round trip

- GIVEN a listed view whose stored `sort` names a primary key and a tie-breaker
- WHEN the view is applied
- THEN `_order` carries both entries, in the stored order

#### Scenario: a sort stored before sorts could be chained still applies

- GIVEN a listed view whose stored `sort` is the single object `{ key: 'created', order: 'desc' }`
- WHEN the view is applied
- THEN it applies as a one-entry sort, exactly as an array of one would

#### Scenario: a sort in the address is applied on a cold open

- GIVEN an address carrying `_order` and no other list state
- WHEN the page is opened in a tab that never applied the view
- THEN the list SHALL be sorted by it, without the view having to be re-applied

---

### Requirement: clearing leaves nothing of the view behind

"Clear all" SHALL remove everything an applied view wrote into the address: its filter keys, its search term and its sort. A view sets state the reader did not choose and cannot see the origin of, so a clear that left any of it behind would leave the list in a state no control on the page could undo.

#### Scenario: clearing after applying a view empties the query

- GIVEN a view carrying filters, a search term and a sort has been applied
- WHEN "Clear all" is used
- THEN the route query SHALL carry none of the view's filter keys, no `_search` and no `_order`

---

### Requirement: save current view

"Save current view…" SHALL open a dialog (CnSaveViewDialog) collecting a required name and an optional public toggle, and persist the CURRENT route-query state via `POST /apps/openregister/api/views` using the direct-`query` payload shape `{ name, description, isPublic, isDefault, query: { filters, search, sort } }`. `sort` SHALL be the ordered array `[{ key, order }, …]`, so a chained sort survives the save, or `null` when there is no sort. The single-object form `{ key, order }` SHALL still be read, because every view stored before sorts could be chained carries it.

#### Scenario: save posts the exact payload derived from the route query

- GIVEN the current route query is `{ status: 'open', _search: 'urgent', _order: '[{"key":"name","order":"asc"}]', _page: '2' }`
- WHEN the user saves the view as "Saved" with the public toggle on
- THEN `POST /apps/openregister/api/views` receives `{ name: 'Saved', description: '', isPublic: true, isDefault: false, query: { filters: { status: 'open' }, search: 'urgent', sort: [{ key: 'name', order: 'asc' }] } }` (no `_page` leakage)

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

