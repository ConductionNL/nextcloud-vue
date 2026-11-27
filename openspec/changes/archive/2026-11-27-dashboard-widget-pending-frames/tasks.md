# Tasks: dashboard-widget-pending-frames

- [x] Drop the grid-wide `widgetConditionsSettled` gate (template spinner and `gridSectionsShown`)
- [x] `isPendingWidget`: a conditional widget awaiting its first verdict keeps its cell with a loading state; `isCollapsedWidget` does not collapse it meanwhile
- [x] Tests: CnDashboardPageBannerCollapse.spec.js (grid at once with a pending cell; unmet verdict leaves on arrival)
