# Proposal: saved-view-kept-in-route

## Why

On dossiq `/my-work` and `/cases?savedView=default:my-work` the view applied, and about three seconds later (when the
saved views had loaded) the address lost `savedView`; the route watcher then left the view and the list fell back to
every case. Two writes dropped the key:

- `resolveQueryFilters` read `savedView` as a record filter, so the index page counted it among the query keys it owns
  and deleted it on the first write of the view's own filters (it also sent `savedView` to the API as a filter).
- Applying the view selects its `overrides.sortOption`, which goes through the sort handler; every route write without
  an explicit `savedView` deleted the key.

## What changes

`savedView` is not a record filter. A route write without an explicit `savedView` keeps the key while the address
names the applied view and the filters are still the view's, so a sort, a search or the view's own sort option keeps
the view; a filter change still leaves it.
