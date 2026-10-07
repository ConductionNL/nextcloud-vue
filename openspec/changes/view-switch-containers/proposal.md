---
kind: code
---

# Proposal: view-switch-containers

## Summary

The design system has a switch, such as "My work | My team", that swaps the
container of widgets below it. Dashboards use it, and so do detail pages such
as the case page. The library only had a switch whose options are routes
(`CnHeaderWidget` `content.views`), so an app could not show two grids on one
page and let the user pick one.

This change adds manifest-declared views to `type: "dashboard"` and
`type: "detail"` pages:

1. `config.views` lists the views. Each view has an `id`, a `label` and its own
   `widgets` and `layout`, drawn with the grid the page already uses.
   `config.defaultView` names the view that opens first.
2. The page draws a segmented control for the views: in the dashboard header,
   in the detail page header, or in a greeting header widget whose
   `content.views.options[]` carry a `view` instead of a `route`. Route options
   keep working.
3. The chosen view is in the address (`?view=<id>`) so it can be linked, and is
   remembered per user and page in the browser. The address wins over the
   remembered view.
4. The control is a radio group that controls the view region. Arrow keys move
   the choice and focus stays on the control.
5. A view with nothing to draw shows a sentence, never a blank area.

## Motivation

Ruben, 7 October 2026: "the new design system introduced a switch element,
that then switches a container containing the grid. This is used both on
dashboards and places like the case detail page, so we should support it
globally." His screenshot shows a greeting with "My work | My team" and an
empty area below the attention card where the grid should be.

## Scope

- `src/mixins/pageViews.js` (new): view state, address, storage, provide.
- `CnDashboardPage`, `CnDetailPage`: the `views`, `defaultView` and
  `viewsLabel` props, the view region and its empty state.
- `CnHeaderWidget`: `content.views.options[].view`.
- `CnSegmentedControl`: the `controls` prop (`aria-controls` on each option).
- Manifest schema 2.48.0: `config.views`, `config.defaultView`,
  `config.viewsLabel`.
- Docs and en/nl strings.

## Out of scope

- Storing the chosen view on the server. The browser store matches how the
  dashboard keeps its date range; the address carries it across devices.
- Per-user arrangement of a view's grid (`userLayout` applies to the page's
  own `layout` only).
