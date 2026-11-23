# Proposal: board-kpi-row-to-grid-gap

## Why

COMPDIFF r32, DqDashboard: the cards under the KPI row stood 32px under the tiles (the row's 20px margin plus GridStack's
12px top inset), against 20px drawn, so every card below sat 12px low.

## What changes

In the board look, a grid right under the KPI row reaches up by the grid margin, as a grid right under the header
already does. The Nextcloud look is unchanged.
