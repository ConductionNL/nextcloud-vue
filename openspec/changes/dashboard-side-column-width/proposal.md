# Proposal: dashboard-side-column-width

## Why

DqMijnWerk draws its side cards (Mijn taken, Recente activiteit) 320px wide and lets the main column fill the rest. On a
twelve-column grid the side is four twelfths, 357px on the board's width, so the main column was 37px narrower and the
side 37px wider than the board on every screen.

## What changes

A dashboard takes `gridSideColumn: { width, from? }`, the page's own and per view. The grid draws the items from column
`from` (8 by default) on at `width` px, the card without its item margins, and the columns before it share the rest.
GridStack keeps its twelve columns: only each item's left edge and width are drawn on the two scales, from the `--gs-x`
and `--gs-w` it writes. It applies on the full twelve-column grid, left to right, and not while editing. A view without
it keeps its twelve shares. Manifest schema 2.142.0.

## Scope

nextcloud-vue CnDashboardGrid, CnDashboardPage and the views mixin; dossiq sets it on the My work view (R22-DASH).
