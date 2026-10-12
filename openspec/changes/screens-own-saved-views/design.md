# Design: screens-own-saved-views

- A separate widget, not a mode of `saved-view`: that one renders the rows of one view and refuses when its id is gone;
  this one renders views.
- The Views API list is session-scoped (own plus public). "Own" is `view.owner === current user`; `own: false` keeps
  the shared ones too.
- The link applies a view the way the index page does when it opens one: the view's filters, search and sort as route
  query (`buildRouteQueryFromViewState`), which `CnIndexPage` reads on load. No new index-page API.
- Counts are `fetchListTotal` over the view's filters, one request per shown view, off by default.
- A view saved before scoping existed (no scope, no schemas) is shown on every source, as the index page does.
