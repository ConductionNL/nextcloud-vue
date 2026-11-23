# Proposal: tabs-widget-actions-off

## Why

The tabs widget draws its own Actions menu beside the strip (Refresh, Request a feature, Report a bug,
Documentation). The boards never draw it, as on board ShDebiteurenbeheer (shillinq #2031), and a manifest could not
turn it off: `showRefresh`, `showRequestFeature` and `showDocumentation` hide single items, and Report a bug and the
open panel's own items kept the menu on screen.

## What changes

- CnTabsWidget takes `showActions` (default `true`). `false` drops the whole menu.
- A manifest sets it as `content.showActions: false` on the tabs widget. The dashboard and the detail host already
  hand a widget's content keys to it as props, so no manifest schema change is needed.

Without the key the menu stays exactly as it is.
