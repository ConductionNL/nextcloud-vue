# Proposal: index-quick-filter-placement-per-view

## Why

dossiq's case list is one index page with four views, and the boards draw the quick-filter chips differently per
view: beside the Filter button and the view switch in the board and map views (DqWerkbord, DqZakenKaart), on their own
row in the table and cards views (DqZaken, DqZakenSorteren). `quickFilterPlacement` is one value for the page, so no
setting matched all four boards (COMPDIFF r22 toolbar `controls 10>7` on DqWerkbord and DqZakenKaart).

## What changes

CnIndexPage takes `quickFilterPlacementByView` (manifest `config.quickFilterPlacementByView`): a placement per view
mode. The current view's entry wins; a view it does not name keeps `quickFilterPlacement`.

## Scope

nextcloud-vue, CnIndexPage. Page config is open, so no schema change.
