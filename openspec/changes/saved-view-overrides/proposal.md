# Proposal: a view can carry page config overrides

## Why

dossiq turned four list pages into default views of its Cases page: the team queue, Assigned to me, and data subject requests (Ruben, 19 October 2026). A view could carry only filters and a field sort. Everything those pages drew on top of a plain list was lost: the stat row, the side cards, the case type chips, the urgency order, the cards, the workload strip, the tabs and the notice. The rule is that nothing users have gets lost.

## What changes

- A default view (`config.defaultSavedViews[].overrides`), and a saved view (`query.overrides`), can carry page config overrides. While the view is active, the index page is drawn with them laid over its own config. Leaving the view, by clearing it or following a plain link to the page, restores the page.
- `overrides` takes page config keys by their own names and shapes: title, showTitle, breadcrumb, headerMeta, notice, pageTabs, headerButtons, addLabel, searchPlaceholder, statRow, quickFilters, quickFiltersFrom, quickFilterPlacement, quickFilterMaxVisible, sidePanel, afterList, columns, cardLayout, cardFields, cardComponent, listConfig, viewModes, viewMode, viewSwitch, countText, footerNote, emptyText, folderSidebar (`null` hides it), sidebar, defaultSort, rowClickToView, showViewAction, actions, includeFields, fieldOverrides.
  - `header` groups the header keys; `tabs` and `views` are aliases of `pageTabs` and `viewModes`.
  - Nothing else is read. A view never changes which register or schema the page reads.
- Three keys are not page config:
  - `sortOption` selects a `sortSelectOptions` entry, an endpoint-sourced one included.
  - `slots` lays registry components over the page's named slots, one name or a list drawn in order. `null` empties a slot.
  - `badge` puts a count on the view's menu entry: `true` counts the view's own list, and `counterVariant: attention` draws the attention pill.
- One generic merge does the work. CnIndexPage reports the applied view's overrides (`view-overrides`), and CnPageRenderer lays them over the page config and slots. A copy of a default keeps them, and so does a saved view whose criteria are rewritten.
- A breadcrumb crumb can carry a `query`, so it can land on a view.
- Manifest schema 2.129.0 declares `overrides` and the crumb `query`.

## Impact

Views without `overrides` behave as before. `cardLayout` reaches the page as the config key of that name; on a library without that key, it has no effect.
