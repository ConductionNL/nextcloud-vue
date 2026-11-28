# Tasks: dashboard-sync-keeps-grown-cells

- [x] `syncGridItems`: a card moved up by the layout stops under the cards above it as the grid holds them (skyline in row order)
- [x] Tests: CnDashboardGridSyncUnderGrownCell.spec.js (grown greeting keeps the counters under it; free moves, column scope, downward moves unchanged; the real engine pushes the greeting on the old row and not on the new one)
- [x] Live check: decidiq Dashboard (simple structure) greeting and quick actions back on row 0
