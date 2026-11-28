# Proposal: dashboard-sync-keeps-grown-cells

## Why

Since the grid no longer waits for widget conditions (dashboard-widget-pending-frames, 27 Nov 2026), a conditional
widget can leave its cell after the grid has laid out. The page then re-compacts its display layout with the AUTHORED
heights and the grid moves the cards below up. A size-to-content cell above them may have grown past its authored
height, so a card moved into that cell's grown rows made GridStack push the cell below every other card: decidiq's
Dashboard greeting (authored 1 row, grown to 2) and its quick actions landed at the bottom of the grid.

## What changes

- `CnDashboardGrid.syncGridItems` moves tracked cards in row order and keeps a skyline of where each card ends as the
  grid holds it. A card the layout moves up stops under the cards above it; moves down and moves with nothing in the
  way are unchanged.

## Impact

- `CnDashboardGrid.vue`, new `CnDashboardGridSyncUnderGrownCell.spec.js` (mocked grid plus the real GridStack engine).
  Every app on nextcloud-vue >= 2.234.3 whose dashboard has a size-to-content cell above a conditional widget.
