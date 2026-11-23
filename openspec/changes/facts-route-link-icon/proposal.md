# Proposal: facts-route-link-icon

## Why

r34 DqContact "Woonadres" and DqOrganisatie "KvK en adres": the board draws a map pin before the foot link "Zaken op de kaart", and the manifest names it (`link.icon: MapMarkerOutline`), but live drew the link bare. The facts widget passed `link.icon` on for a sidebar-tab link and an href link only, not for a link to a route.

## What changes

A facts foot link draws its icon whatever it opens: a route, a sidebar tab or an href. No schema change.
