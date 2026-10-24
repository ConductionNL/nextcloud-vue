# Proposal: index-toolbar-start-and-active-only-quick-filters

## Why

DqAanMijToegewezen draws the team's name chips ("Pieter Jansen (u) 7", "Anouk Bakker 9", ...) on the toolbar row, before
Filter and the view switch, and the view's one quick filter ("Inclusief werk waarvoor u waarneemt") only as a chip on the
Active line. Live draws the name chips in a block under the header and the quick filter as a tab on the toolbar row, so
the row holds 7 controls where the board draws 10 (r25 measurement), and the filter shows twice.

## What changes

- CnIndexPage gets a `toolbar-start` slot: the page's own controls at the start of the toolbar row, before the
  quick-filter chips, in both looks (the bar's `filters` slot). A manifest page fills it through `slots`.
- `quickFilterPlacement` takes `active`: no tabs are drawn; a chosen tab with an `activeLabel` shows only on the Active
  line, where it can be removed. Also per view (`quickFilterPlacementByView`) and as a saved-view override.
- Schema 2.154.0: the `active` enum value.
