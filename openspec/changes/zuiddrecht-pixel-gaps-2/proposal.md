---
kind: code
---

# Proposal: zuiddrecht-pixel-gaps-2

## Summary

Round two of the Zuiddrecht pixel match. The live dossiq screens on 2.64.0
still differ from the DqDashboard and DqZaak boards in nine places that live in
`@conduction/nextcloud-vue`. Three are defects in round one's own opt-ins and
are fixed outright; the rest are new opt-in keys whose default renders exactly
as 2.64.0 does, so an app that declares nothing keeps the Nextcloud look.

1. The navigation primary action is never clipped (fix).
2. A declared breadcrumb label shows as text (fix to round one's breadcrumb;
   `breadcrumb.icon` keeps an icon for an app that wants one).
3. The stages bar labels share one line (fix to round one's bars variant).
4. A greeting can sit on the page ground (`content.ground`).
5. A dashboard can drop the widget actions menu (`config.showWidgetActions`).
6. A stat tile can take the stacked board look (`content.layout: "stacked"`).
7. A detail header can be a card that holds a widget (`config.headerCard`,
   `config.headerWidget`).
8. The navigation footer can be declared (`nav.footer`).
9. A schema title falls back to its written form on a 404.

## Motivation

Ruben's standard: every app screen matches its design board, with Nextcloud's
top bar the only allowed difference, and every change optional so an app can
still render the Nextcloud way. The coordinator compared the live dossiq case
and dashboard against the boards after round one and listed these nine.

## Scope

`@conduction/nextcloud-vue` only. Minor release, manifest schema 2.46.0 to
2.47.0. Placing the favourites, follow, dwell and attention blocks below the
tabs or in the side column needs nothing here: the app's `layout` (`gridY`) and
`config.sideColumn` already place a widget there.
