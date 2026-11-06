---
kind: code
---

# The board store lists the shipped packages

## Why
Board DqMarktplaats draws a store without a registry as the packages the app ships, with their version, installed state and an install button, beside a card about the registry. CnStorePage only listed static `builtIn` cards.

## What changes
- `config.shipped` on a store page: under the board look, while no registry is configured, CnStorePage draws CnStorePackages in place of the filters and `builtIn`.
- CnStorePackages reads `/apps/<app>/api/store/packages` and posts `/apps/<app>/api/store/packages/{id}/install`. The button follows `canInstall`; the route decides.
- Without `config.shipped`, without the look, or with a registry, the page is unchanged.
