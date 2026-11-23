# Proposal: a-tour-starts-on-the-pages-it-names

## Why

On 13 October a staff user's first visit to dossiq was a link to a Woo request. The getting-started tour, whose first step is a centered "Welcome to Dossiq" card, opened over the case they came for.

`CnWalkthrough` gates auto-start on a route only when the first step spotlights a page or nav item (ADR-062). A centered first step is deliberately not gated, because gating it on the anchor's route hid the tour on landing pages across the fleet (2026-08-27). So an app had no way to say "start my tour on the dashboard, not on a deep link".

## What changes

1. A tour may declare `startOn`: one or more route names it may auto-start on (schema 2.94.0, `minItems: 1`, unique, non-empty strings).
2. `routeMatchesTour()` honours it first. Off a named route the tour waits in `_pendingAutoTour` and opens when the router reaches a named route, through the same path a page-anchored tour uses.
3. A tour without `startOn` behaves exactly as before. A tour started by hand ignores it.

## Consumer impact

None without the key. dossiq declares `startOn: ["Dashboard"]` on its getting-started tour once this is released.
