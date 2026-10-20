# menu-widget-links-under-router-base

## Why

dossiq's Catalogue page (board dossiq/DqCatalogus) lists its folders in a menu widget whose item URLs carry the app's
path (`/index.php/apps/dossiq/settings/case-types`). The widget resolved every in-app URL through the router, which adds
the app's base, so each link pointed at `/index.php/apps/dossiq/index.php/apps/dossiq/...` and a click pushed a path the
router does not have. Under a router base an item written without the base (`/settings/attributes`) was never the
active item either: the widget compared it with the full browser path.

## What changes

- A menu URL that already carries the router's base is a path in the app: its href carries the base once and a click
  routes to the path below the base.
- Under a router base the open page is the active item whether its URL was written with the base or without it.
- Without a router base nothing changes.
