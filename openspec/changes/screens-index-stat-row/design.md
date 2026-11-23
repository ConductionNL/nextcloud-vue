# Design: screens-index-stat-row

## D1. One internal host component

`CnIndexPageWidgets` (internal to CnIndexPage, not exported) takes a list of
widget definitions and a variant (`stat-row`, `side-panel`). It resolves each
type in the same three layers as CnDashboardPage's `registryRenderer`
(consumer `cnRegistry`, dashboard catalog with alias fallback, built-ins),
and wraps each in CnWidgetWrapper with no Actions menu: a stat tile without a
title (the tile has its own label), a side card with its translated title and
optional `headerLink`. An entry without an id, or whose type nothing
resolves, is skipped with a development warning.

## D2. Layout without moving the toolbar or the list

The toolbar (CnActionsBar) and the list (`.cn-index-page__body`) are siblings
in a flex column that other lanes edit. Wrapping them would reindent hundreds
of template lines. Instead, with a side panel the root switches to a grid
(`cn-index-page--with-side-panel`): named areas put the header, the
below-header slot and the stat row across both columns, the toolbar and the
list in the first, and the side panel in the second, spanning both rows.
Every other child (closed dialogs, the inline sidebar) lands in a trailing
area. The list row is the flexible track, so a side panel taller than the
toolbar never opens a gap under the toolbar. Below 1024px the grid is one
column with the panel above the toolbar.

The stat row needs no layout change: it is one more block in the flex column.
