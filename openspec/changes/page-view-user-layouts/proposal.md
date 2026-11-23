---
kind: code
---

# Proposal: page-view-user-layouts

## Summary

Page views (`config.views`, from view-switch-containers) get per-user layouts.
On a page with `config.userLayout: true`, a user arranges the grid inside each
view the same way they arrange a dashboard's own grid today. The arrangement
is remembered per view and per user, through the same storage the dashboard's
own user layout uses: a user preference on the server, mirrored in the
browser. Resetting returns the view to the layout the manifest ships.

1. CnDashboardPage: with `userLayout` on, the view grid is draggable in edit
   mode like the page's own grid. Leaving edit mode stores each view the user
   moved, once. Edit mode shows "Reset layout", which returns the page's own
   grid and the chosen view to the manifest. Other views keep theirs.
2. CnDetailPage: a new `userLayout` prop. On, the header shows "Arrange view"
   next to the view switch. "Done" stores the arrangement, "Reset view"
   returns the chosen view to the manifest.
3. The record for a view is stored under the page's layout key with the view
   id appended: `dashboard-layout.<page>.view.<view>`. The manifest decides
   which widgets a view has, the user decides where they sit (the existing
   `mergeUserLayout` rule).

## Motivation

Ruben, 7 October 2026: views should be arrangeable per user, exactly like the
page's own grid, and remembered per view. Before this change a dashboard with
`userLayout` locked the view grid (`editable: gridEditable && !userLayout`),
and a drag in a view, where it was possible, wrote into the manifest.

## Scope

- `src/mixins/pageViews.js`: per-view load, save, reset and drag handling.
- `src/store/plugins/dashboardLayouts.js`: `resolveUserLayoutApi`, the load,
  save and reset calls shared by the page's own grid and its views.
- `src/components/CnDashboardPage/CnDashboardPage.vue`,
  `src/components/CnDetailPage/CnDetailPage.vue`.

## Backward compatibility

Off by default. A page without `userLayout` renders and edits its views
exactly as before: no request, and a drag in edit mode still writes into the
manifest view for the in-app manifest editor.
